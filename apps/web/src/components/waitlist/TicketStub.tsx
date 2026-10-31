const BARCODE = [4, 2, 6, 2, 3, 8, 2, 4, 2, 6, 3, 2, 8, 2, 4, 3, 2, 6, 2, 4, 8, 2, 3, 5];

/** The perforated stub. No ticket number and no digits: we don't reveal how many people joined. */
export function TicketStub() {
  return (
    <div className="stub" aria-hidden="true">
      <div className="stub__top">
        <span className="stub__small">ADMIT ONE</span>
        <span className="stub__big">SEASON 0</span>
      </div>
      <div className="stub__barcode">
        {BARCODE.map((w, i) => (
          <span key={i} style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}
