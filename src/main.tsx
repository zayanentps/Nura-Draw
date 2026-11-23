import {createRoot} from 'react-dom/client';
import * as fabric from 'fabric';
import App from './App.tsx';
import './index.css';

// Force raw vector rendering across all Fabric objects (no offscreen bitmap caching / blur on zoom)
fabric.FabricObject.ownDefaults.objectCaching = false;
fabric.InteractiveFabricObject.ownDefaults.noScaleCache = false;
// Compact, crisp vector control points (instead of Fabric's oversized 13px default handles)
fabric.InteractiveFabricObject.ownDefaults.cornerSize = 6;
fabric.InteractiveFabricObject.ownDefaults.touchCornerSize = 14;
fabric.InteractiveFabricObject.ownDefaults.cornerStyle = 'rect';
fabric.InteractiveFabricObject.ownDefaults.cornerColor = '#ffffff';
fabric.InteractiveFabricObject.ownDefaults.cornerStrokeColor = '#0078d7';
fabric.InteractiveFabricObject.ownDefaults.transparentCorners = false;
fabric.InteractiveFabricObject.ownDefaults.borderColor = '#0078d7';
fabric.InteractiveFabricObject.ownDefaults.borderScaleFactor = 1;
fabric.InteractiveFabricObject.ownDefaults.borderOpacityWhenMoving = 0.65;
fabric.InteractiveFabricObject.ownDefaults.padding = 0;
fabric.IText.ownDefaults.editingBorderColor = 'rgba(0, 120, 215, 0.75)';
fabric.config.configure({
  perfLimitSizeTotal: 16777216,
  maxCacheSideLimit: 8192,
  devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
});

createRoot(document.getElementById('root')!).render(<App />);
