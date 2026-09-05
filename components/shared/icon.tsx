type IconName = 'plus' | 'close' | 'arrow-right' | 'external-link';

const paths: Record<IconName, React.ReactNode> = {
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
  'arrow-right': <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
  'external-link': <><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
