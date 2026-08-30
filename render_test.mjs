import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App.js';

try {
  const _html = renderToString(React.createElement(App));
  console.log("Render successful");
} catch (e) {
  console.error("Render failed:", e);
}
