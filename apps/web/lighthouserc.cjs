module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'PORT=3001 npm run start',
      startServerReadyPattern: 'ready|started|localhost',
      startServerReadyTimeout: 60000,
      url: [
        'http://127.0.0.1:3001/en',
        'http://127.0.0.1:3001/en/search?q=sneaker',
        'http://127.0.0.1:3001/admin/login',
      ],
      settings: {
        preset: 'desktop',
        maxWaitForLoad: 90000,
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'speed-index': ['warn', { maxNumericValue: 4500 }],
        interactive: ['warn', { maxNumericValue: 5000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
