import {createRoot} from 'react-dom/client';
import * as fabric from 'fabric';
import App from './App.tsx';
import './index.css';

// Force raw vector rendering across all Fabric objects (no offscreen bitmap caching / blur on zoom)
fabric.FabricObject.ownDefaults.objectCaching = false;
fabric.InteractiveFabricObject.ownDefaults.noScaleCache = false;
fabric.config.configure({
  perfLimitSizeTotal: 16777216,
  maxCacheSideLimit: 8192,
  devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
});

createRoot(document.getElementById('root')!).render(<App />);
