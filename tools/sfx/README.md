# Stackz sounds

`synth.py` generates every sound on the site from code, so nothing is sampled or licensed.

The music follows the hero board: one game tick (90 ms) is one 16th note, so the tempo is 166.67 BPM.

| Output            | What it is                                                          |
| ----------------- | ------------------------------------------------------------------- |
| `theme-intro.mp3` | 5.76 s (4 bars) that build up, played once                          |
| `theme-loop.mp3`  | 23.04 s (16 bars), loops seamlessly after the intro                 |
| `click.mp3`       | Button and link presses                                             |
| `lock.mp3`        | A piece locking on the hero board                                   |
| `line-clear.mp3`  | Lines clearing on the hero board                                    |
| `task-done.mp3`   | A waitlist task powering up to DONE, and a successful join          |

To regenerate (needs Python 3 with numpy and scipy, plus ffmpeg):

```sh
cd tools/sfx
python3 synth.py
for f in theme-intro theme-loop click lock line-clear task-done; do
  ffmpeg -y -loglevel error -i "$f.wav" -c:a libmp3lame -b:a 192k "../../apps/web/public/sfx/$f.mp3"
done
rm -f *.wav
```

If you change the tempo or lengths, update `TICK_SECONDS`, `INTRO_SECONDS` and `LOOP_SECONDS` in `apps/web/src/audio/sound.ts` to match.
