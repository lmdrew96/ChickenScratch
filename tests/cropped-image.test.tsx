 import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

import { CroppedImage } from '@/components/gallery/cropped-image';

// JSDOM doesn't load images; we simulate cached images by making `complete = true`
// and providing `naturalWidth/Height`.
function mockImageDimensions({ w, h }: { w: number; h: number }) {
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get() {
      return true;
    },
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get() {
      return w;
    },
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
    configurable: true,
    get() {
      return h;
    },
  });
}

describe('CroppedImage', () => {
  beforeEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders a non-zero wrapper size when crop is provided and image is already complete', async () => {
    mockImageDimensions({ w: 1000, h: 500 });

    const { container } = render(
      <CroppedImage
        src="https://example.com/image.jpg"
        alt="test"
        crop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        rotation={0}
      />
    );

    // After effect runs, component should switch from <img> fallback to wrapper <div>.
    // The wrapper is the first div in this render.
    const wrapper = container.querySelector('div');
    expect(wrapper).not.toBeNull();

    const style = (wrapper as HTMLDivElement).style;
    expect(Number.parseFloat(style.width)).toBeGreaterThan(0);
    expect(Number.parseFloat(style.height)).toBeGreaterThan(0);
  });

  it('swaps painted dimensions for 90° rotation and still produces visible wrapper', async () => {
    mockImageDimensions({ w: 800, h: 600 });

    const { container } = render(
      <CroppedImage
        src="https://example.com/image.jpg"
        alt="test"
        crop={{ top: 0, right: 25, bottom: 0, left: 25 }}
        rotation={90}
      />
    );

    const wrapper = container.querySelector('div');
    expect(wrapper).not.toBeNull();

    const style = (wrapper as HTMLDivElement).style;
    // paintedW = naturalH = 600, so visible width should be 600 * (1 - .5) = 300
    expect(Number.parseFloat(style.width)).toBeCloseTo(300, 3);
    // paintedH = naturalW = 800, so visible height should be 800
    expect(Number.parseFloat(style.height)).toBeCloseTo(800, 3);
  });
});

