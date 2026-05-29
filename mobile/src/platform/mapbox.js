import mapboxgl from 'mapbox-gl';
import workerUrl from 'mapbox-gl/dist/mapbox-gl-csp-worker.js?url';

mapboxgl.workerUrl = workerUrl;

export default mapboxgl;
export { workerUrl };
