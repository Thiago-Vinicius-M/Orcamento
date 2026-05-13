import { useEffect, useLayoutEffect, useRef } from "react";

export function useAsyncEffect(
  fn: (signal: { cancelled: boolean }) => Promise<void>,
  deps: ReadonlyArray<unknown>,
): void {
  const fnRef = useRef(fn);

  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    const signal = { cancelled: false };
    const timeout = window.setTimeout(() => {
      void fnRef.current(signal);
    }, 0);
    return () => {
      signal.cancelled = true;
      window.clearTimeout(timeout);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps -- `deps` é o contrato público; `fn` via ref
}
