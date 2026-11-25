import * as Progress from '@radix-ui/react-progress';

export default function Meter({ value, large = false }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <Progress.Root
      className={large ? 'progress-bar-bg' : 'criterion-bar-bg'}
      value={safe}
      aria-label={`${safe}%`}
    >
      {large ? <span className="progress-bar-target" title="Meta mínima de 70% em cada etapa" /> : null}
      <Progress.Indicator
        className={large ? 'progress-bar-fill' : 'criterion-bar-fill'}
        style={{ transform: `translateX(-${100 - safe}%)` }}
      />
    </Progress.Root>
  );
}
