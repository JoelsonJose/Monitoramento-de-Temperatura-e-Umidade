export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M22.8 6.4c-8.7.2-14 4-14 11.4 0 4.8 3.2 8.1 7.8 8.1 6.6 0 10.2-7.1 6.2-19.5Z" fill="#F2A51A" />
          <path d="M17.1 9.1c.3-3.5 2.3-5.4 6.3-5.6-.6 3.2-2.6 5.1-6.3 5.6Z" fill="#39774A" />
          <path d="M12 21.8c2.1-5.4 5.8-9 10.2-11.9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="brand-name">Manga <span>Trace</span></span>
    </div>
  );
}
