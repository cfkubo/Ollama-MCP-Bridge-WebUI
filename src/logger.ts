import winston from 'winston';
import chalk from 'chalk';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface CustomLevels {
  levels: {
    [key in LogLevel]: number;
  };
  colors: {
    [key in LogLevel]: keyof typeof chalkColors;
  };
}

const chalkColors = {
  red: chalk.red,
  yellow: chalk.yellow,
  green: chalk.green,
  cyan: chalk.cyan,
  gray: chalk.gray
} as const;

const customLevels: CustomLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'cyan',
  },
};

function getFormattedTime(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export const logger = winston.createLogger({
  levels: customLevels.levels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message }) => {
      const color = customLevels.colors[level as LogLevel];
      const colorFn = chalkColors[color];
      const levelStr = colorFn(level.toUpperCase());
      const nameStr = chalkColors.cyan('LLMBridge');
      const timeStr = chalkColors.gray(getFormattedTime());
      return `${timeStr} ${levelStr}:     ${nameStr} - ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      level: 'debug' // Changed to 'debug' to show more output
    })
  ]
});