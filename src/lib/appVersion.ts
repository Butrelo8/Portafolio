import pkg from '../../package.json' with { type: 'json' };

export const appVersion: string = (pkg as { version: string }).version;
