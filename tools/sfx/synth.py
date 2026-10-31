import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 44100
TICK = 0.09                      # one game tick = one 16th note (hero board speed)
BPM = 60 / (TICK * 4)            # 166.67
BAR = TICK * 16
rng = np.random.default_rng(7)

def n2f(n):                      # note name -> Hz
    names = {'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11}
    o = int(n[-1]); k = names[n[:-1]]
    return 440 * 2 ** ((k - 9) / 12 + (o - 4))

def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)

def env(n, a=0.002, d=0.1, s=0.0, r=0.05, hold=None):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4))
    e = e * (s + (1 - s) * np.exp(-np.maximum(t - a, 0) / max(d, 1e-4)))
    if hold is not None:
        rel = np.clip((t - hold) / r, 0, 1)
        e = e * (1 - rel)
    return e

def pulse(f, n, duty=0.25):
    t = np.arange(n) / SR
    ph = (f * t) % 1
    return np.where(ph < duty, 1.0, -1.0)

def saw(f, n, det=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * (1 + det) * t) % 1) - 1

# ---------- instruments ----------
def hat(acc=False):
    n = int(0.05 * SR)
    x = hp(rng.standard_normal(n), 7000) * env(n, 0.0005, 0.018 if not acc else 0.03)
    return x * (0.22 if acc else 0.13)

def kick(heavy=False):
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 46 + (130 if heavy else 95) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * env(n, 0.001, 0.16 if heavy else 0.11)
    click = hp(rng.standard_normal(n), 2500) * env(n, 0.0002, 0.004) * 0.25
    return (x + click) * (0.95 if heavy else 0.7)

def clap():
    n = int(0.2 * SR)
    x = bp(rng.standard_normal(n), 900, 4200)
    e = env(n, 0.001, 0.06)
    for k in (0.008, 0.017):                      # flam taps
        s = int(k * SR); e[s:] += 0.6 * env(n - s, 0.0005, 0.01)
    return x * e * 0.32

def bass(f, dur):
    n = int(dur * SR)
    x = 0.6 * saw(f, n) + 0.4 * pulse(f, n, 0.5)
    x = lp(x, 260 + 900 * 0.5) * env(n, 0.003, 0.12, 0.35, 0.03, hold=dur * 0.85)
    sub = np.sin(2 * np.pi * f / 2 * np.arange(n) / SR) * env(n, 0.003, 0.2, 0.5, 0.03, hold=dur * 0.85)
    return 0.32 * x + 0.28 * sub

def arp(f, dur):
    n = int(dur * SR)
    return lp(pulse(f, n, 0.25), 3200) * env(n, 0.001, 0.05) * 0.075

def lead(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.12) / 0.1, 0, 1)
    ph = np.cumsum(f * vib) / SR
    x = np.where((ph % 1) < 0.5, 1.0, -1.0)
    return lp(x, 2600) * env(n, 0.004, 0.25, 0.55, 0.04, hold=dur * 0.9) * 0.11

def pad(freqs, dur):
    n = int(dur * SR)
    x = np.zeros(n)
    for f in freqs:
        for d in (-0.006, 0.0, 0.007):
            x += saw(f, n, d)
    a = np.minimum(1, np.arange(n) / (0.35 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR))
    return lp(x / (3 * len(freqs)), 900) * a * 0.16

def riser(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = rng.standard_normal(n)
    out = np.zeros(n); seg = 2048
    for i in range(0, n, seg):                    # sweeping band
        c = 400 + 7000 * t[i] ** 2
        out[i:i+seg] = bp(x[i:i+seg], c * 0.7, min(c * 1.4, 18000))
    return out * t ** 2 * 0.22

def crash():
    n = int(1.6 * SR)
    return hp(rng.standard_normal(n), 4500) * env(n, 0.001, 0.45) * 0.16

# ---------- arrangement ----------
CHORDS = {
    'Am': ['A2', ['A3', 'C4', 'E4'], ['A4', 'E5', 'C5', 'A4', 'E4', 'C5', 'A4', 'E4']],
    'F':  ['F2', ['F3', 'A3', 'C4'], ['A4', 'F5', 'C5', 'A4', 'F4', 'C5', 'A4', 'F4']],
    'Dm': ['D2', ['D3', 'F3', 'A3'], ['F5', 'D5', 'A4', 'F4', 'D5', 'A4', 'F4', 'D4']],
    'E':  ['E2', ['E3', 'G#3', 'B3'], ['G#5', 'E5', 'B4', 'G#4', 'E5', 'B4', 'G#4', 'E4']],
}
PROG = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E'] * 2
MELODY = [  # (note or None, length in 8ths), two bars per chord pair; plays bars 9-16
    ('E5',2),('C5',1),('D5',1),('E5',2),('A4',2),  ('B4',1),('C5',1),('D5',2),('C5',1),('B4',1),('A4',2),
    ('A4',2),('F4',1),('A4',1),('C5',2),('A4',2),  ('C5',1),('D5',1),('C5',1),('A4',1),('F4',4),
    ('D5',2),('F5',1),('E5',1),('D5',2),('A4',2),  ('F5',1),('E5',1),('D5',1),('C5',1),('D5',4),
    ('B4',2),('G#4',1),('B4',1),('E5',2),('D5',1),('C5',1),  ('B4',2),('G#4',2),('E4',4),
]

def place(buf, x, at, pan=0.0):
    s = int(at * SR)
    e = min(len(buf), s + len(x))
    if e <= s: return
    l, r = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
    buf[s:e, 0] += x[:e - s] * l
    buf[s:e, 1] += x[:e - s] * r

def render(bars, layers, melody=False, intro=False):
    total = bars * BAR
    buf = np.zeros((int((total + 2.0) * SR), 2))
    lock_every = 24                                # a piece locks roughly every 24 ticks in the hero game
    for b in range(bars):
        ch = PROG[b % 16]
        root, triad, arp_notes = CHORDS[ch]
        t0 = b * BAR
        L = layers(b)
        for s in range(16):
            t = t0 + s * TICK
            g = b * 16 + s
            if 'hat' in L: place(buf, hat(s % 4 == 2), t, pan=0.25 if s % 2 else -0.25)
            if 'kick' in L and s in (0, 8, 11): place(buf, kick(), t)
            if 'lock' in L and g % lock_every == lock_every - 1: place(buf, kick(heavy=True) * 0.8, t)
            if 'clap' in L and s in (4, 12): place(buf, clap(), t)
            if 'arp' in L:
                f = n2f(arp_notes[s % 8])
                place(buf, arp(f, TICK * 0.9), t, pan=-0.35)
                place(buf, arp(f, TICK * 0.9) * 0.4, t + TICK * 3, pan=0.45)   # dotted-8th echo
            if 'bass' in L and s % 2 == 0:
                f = n2f(root) * (2 if s in (6, 14) else 1)
                place(buf, bass(f, TICK * 2), t)
        if 'pad' in L:
            place(buf, pad([n2f(n) for n in triad], BAR + 0.05), t0)
        if 'riser' in L:
            place(buf, riser(BAR), t0)
        if 'crash' in L:
            place(buf, crash(), t0)
    if melody:
        t = 8 * BAR
        for note, ln in MELODY:
            d = ln * TICK * 2
            if note: place(buf, lead(n2f(note), d), t, pan=0.1)
            t += d
    return buf, total

def master(buf, total, loop=True):
    n = int(total * SR)
    if loop:                                       # wrap tails so the loop is seamless
        tail = buf[n:]
        buf = buf[:n].copy()
        buf[:len(tail)] += tail
    else:
        buf = buf[:n + int(1.2 * SR)]
    buf = np.tanh(buf * 1.4) / np.tanh(1.4)
    return buf / np.max(np.abs(buf)) * 0.89

# Main loop: 16 bars (23.04 s). Line-clear riser every 4 bars, crash on the bar after.
def loop_layers(b):
    L = {'hat', 'kick', 'clap', 'bass', 'pad', 'lock'}
    if b >= 4: L.add('arp')
    if b % 4 == 3: L.add('riser')
    if b % 4 == 0: L.add('crash')
    return L

# Intro: 4 bars, builds like the headline assembling (blocks land, then the game starts).
def intro_layers(b):
    return [{'hat'}, {'hat', 'lock'}, {'hat', 'lock', 'bass', 'pad'}, {'hat', 'kick', 'bass', 'pad', 'riser'}][b]

loop_buf, lt = render(16, loop_layers, melody=True)
intro_buf, it = render(4, intro_layers)
wavfile.write('theme-loop.wav', SR, (master(loop_buf, lt) * 32767).astype(np.int16))
wavfile.write('theme-intro.wav', SR, (master(intro_buf, it, loop=False)[:int(it * SR)] * 32767).astype(np.int16))

# ---------- UI + game stingers ----------
def write(name, x):
    x = x / np.max(np.abs(x)) * 0.85
    wavfile.write(name, SR, (np.stack([x, x], 1) * 32767).astype(np.int16))

n = int(0.075 * SR); t = np.arange(n) / SR
blip = np.where(((np.cumsum(1250 * np.exp(-t / 0.02) + 620) / SR) % 1) < 0.5, 1.0, -1.0)
click = lp(blip, 4200) * env(n, 0.0005, 0.018) * 0.6 + hp(rng.standard_normal(n), 3000) * env(n, 0.0002, 0.003) * 0.5
write('click.wav', click)

lock = kick(heavy=True)[: int(0.2 * SR)] * env(int(0.2 * SR), 0.0005, 0.07) + hp(rng.standard_normal(int(0.2 * SR)), 1800) * env(int(0.2 * SR), 0.0003, 0.006) * 0.3
write('lock.wav', lock)

lc = np.zeros(int(0.9 * SR))
for i, nn in enumerate(['A4', 'C5', 'E5', 'A5', 'C6', 'E6']):
    x = arp(n2f(nn), 0.12) * 8; s = int(i * 0.045 * SR); lc[s:s + len(x)] += x
r = riser(0.35)[::-1] * 3; lc[:len(r)] += r
write('line-clear.wav', lc)

done = np.zeros(int(0.5 * SR))
for i, nn in enumerate(['E5', 'A5']):
    x = arp(n2f(nn), 0.22) * 8; s = int(i * 0.07 * SR); done[s:s + len(x)] += x
write('task-done.wav', done)

print('BPM', round(BPM, 2), 'loop seconds', round(lt, 2), 'intro seconds', round(it, 2))
