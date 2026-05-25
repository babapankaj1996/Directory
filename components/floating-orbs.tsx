export function FloatingOrbs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute left-[8%] top-28 h-44 w-44 rounded-full bg-blue-200/35 blur-3xl" />
      <div className="absolute right-[7%] top-36 h-56 w-56 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="absolute bottom-16 left-[20%] h-52 w-52 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="absolute bottom-[25%] right-[20%] h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" />
    </div>
  );
}
