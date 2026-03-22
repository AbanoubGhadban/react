'use client';

import * as React from 'react';
import './Dynamic.css';

export function Dynamic() {
  return (
    <div data-testid="dynamic-component" className="dynamic-component">
      This client component should be loaded in a single chunk even when it is
      used as both a client reference and as a dynamic import.
    </div>
  );
}
