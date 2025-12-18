import { useEffect, useRef } from 'react';

type WheelVersion = 'v1' | 'canvas' | 'rainbow' | 'redwhite' | 'colorful';

interface WheelPreviewProps {
  version: WheelVersion;
  size?: number;
}

export function WheelPreview({ version, size = 200 }: WheelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    // 清空畫布
    ctx.clearRect(0, 0, size, size);

    if (version === 'canvas') {
      drawClassicWheel(ctx, centerX, centerY, radius);
    } else if (version === 'rainbow') {
      drawRainbowWheel(ctx, centerX, centerY, radius);
    } else if (version === 'redwhite') {
      drawRedWhiteWheel(ctx, centerX, centerY, radius);
    } else if (version === 'colorful') {
      drawColorfulWheel(ctx, centerX, centerY, radius);
    }
  }, [version, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-full"
    />
  );
}

function drawClassicWheel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF'
  ];

  // 繪製扇形
  colors.forEach((color, index) => {
    const startAngle = (index / colors.length) * Math.PI * 2;
    const endAngle = ((index + 1) / colors.length) * Math.PI * 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // 邊框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 外圓框
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 中心圓
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRainbowWheel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  const colors = [
    '#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF',
    '#4B0082', '#9400D3', '#FF1493', '#00CED1', '#FFD700'
  ];

  // 繪製漸層扇形
  colors.forEach((color, index) => {
    const startAngle = (index / colors.length) * Math.PI * 2;
    const endAngle = ((index + 1) / colors.length) * Math.PI * 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  });

  // 外圓框
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 白色圓點裝飾
  const dotCount = 20;
  for (let i = 0; i < dotCount; i++) {
    const angle = (i / dotCount) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (radius - 8);
    const y = centerY + Math.sin(angle) * (radius - 8);
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 中心圓
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawRedWhiteWheel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  const colors = ['#FF0000', '#FFFFFF'];

  // 繪製紅白相間
  for (let i = 0; i < 10; i++) {
    const startAngle = (i / 10) * Math.PI * 2;
    const endAngle = ((i + 1) / 10) * Math.PI * 2;

    ctx.fillStyle = colors[i % 2];
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
  }

  // 黃色外框
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 星星裝飾
  const starCount = 12;
  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * (radius - 5);
    const y = centerY + Math.sin(angle) * (radius - 5);
    drawStar(ctx, x, y, 5, 3, 3);
  }

  // 中心圓
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawColorfulWheel(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#A8E6CF',
    '#FF8C94', '#6BCB77', '#4D96FF', '#FFD93D', '#6BCB77'
  ];

  // 繪製多色區塊
  colors.forEach((color, index) => {
    const startAngle = (index / colors.length) * Math.PI * 2;
    const endAngle = ((index + 1) / colors.length) * Math.PI * 2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // 邊框
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // 黃色外框
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 中心圓
  ctx.fillStyle = '#FFF';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = Math.PI / 2 * 3;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;

    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = '#FFD700';
  ctx.fill();
}
