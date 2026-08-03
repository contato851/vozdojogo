interface SoccerBallProps {
  size?: number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function SoccerBall({ size = 24, color = 'currentColor', style, className }: SoccerBallProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={1.4}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2l3.2 2.3-1.2 3.8h-4l-1.2-3.8z" fill={color} stroke="none" />
      <path d="M12 7.2V4.3M15.2 9.5l2.5-1.6M13.9 13.3l1 2.6M10.1 13.3l-1 2.6M8.8 9.5L6.3 7.9" />
    </svg>
  );
}
