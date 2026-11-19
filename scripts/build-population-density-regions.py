#!/usr/bin/env python3
"""Build GeoWeb's actual 2020 regional density display texture from numeric F32.

Developer-only dependencies: numpy, rasterio, Pillow. No browser dependency.
Usage: python scripts/build-population-density-regions.py /path/density-2020-float.tif
The exact public ArcGIS export request is retained in output metadata.
"""
from pathlib import Path
import argparse,datetime,urllib.parse,json,hashlib,numpy as np,rasterio
from PIL import Image
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='Downloaded WorldPop 2020 exportImage F32 TIFF')
parser.add_argument('--output-dir',type=Path,default=Path(__file__).resolve().parents[1]/'public/lab-data')
args=parser.parse_args()
out=args.output_dir;out.mkdir(parents=True,exist_ok=True)
source=args.source
service='https://worldpop.arcgis.com/arcgis/rest/services/WorldPop_Population_Density_1km/ImageServer'
params={'f':'json','bbox':'-180,-90,180,90','bboxSR':4326,'imageSR':4326,'size':'4096,2048','format':'tiff','pixelType':'F32','time':'1577836800000','renderingRule':json.dumps({'rasterFunction':'None'}),'interpolation':'RSP_BilinearInterpolation','noDataInterpretation':'esriNoDataMatchAny'}
export_url=service+'/exportImage?'+urllib.parse.urlencode(params)
colors=np.array([[255,245,240,12],[253,208,193,45],[252,160,130,95],[239,90,67,165],[183,25,43,230]],dtype=np.uint8)
thresholds=np.array([1,10,100,1000],dtype=np.float32)
with rasterio.open(source) as ds:
 if ds.width!=4096 or ds.height!=2048 or ds.crs.to_epsg()!=4326 or tuple(ds.bounds)!=(-180.0,-90.0,180.0,90.0):
  raise ValueError('Expected 4096×2048 global WGS84 F32 export, extent -180,-90,180,90')
 data=ds.read(1,masked=True);values=np.asarray(data.filled(np.nan),dtype=np.float32)
 # ArcGIS F32 export has an untagged +3.4e38 NoData sentinel over oceans.
 valid=(~np.ma.getmaskarray(data))&np.isfinite(values)&(values>=0)&(values<1e30)
 classes=np.searchsorted(thresholds,values,side='right');rgba=colors[np.clip(classes,0,4)];rgba[~valid]=0
 png=out/'geoweb-population-density-regions.png';Image.fromarray(rgba,mode='RGBA').save(png,optimize=True)
 samples={name:float(next(ds.sample([point]))[0]) for name,point in {'Seoul':[126.978,37.5665],'Delhi':[77.209,28.6139],'Tokyo':[139.6917,35.6895],'NewYork':[-74.006,40.7128],'KoreaMountainRural':[128.3,37.2],'MongoliaRural':[103,46],'Sahara':[15,24]}.items()}
 metadata={'version':1,'year':2020,'unit':'people/km²','geography':'Actual gridded regional population density; country borders and original geographic positions remain unchanged.','model':'WorldPop Global1 top-down unconstrained population density, Random Forest-based dasymetric redistribution','sourceResolutionArcSeconds':30,'sourceApproximateResolution':'1 km at the equator','width':ds.width,'height':ds.height,'extent':[-180,-90,180,90],'crs':'EPSG:4326','sourceNoDataSentinel':3.4e38,'rowOrder':'north-to-south','columns':'west-to-east','displayResampling':'ArcGIS exportImage bilinear interpolation of numeric float32 density to 4096×2048; not a national-average map','classes':[{'min':0,'max':1,'rgba':colors[0].tolist()},{'min':1,'max':10,'rgba':colors[1].tolist()},{'min':10,'max':100,'rgba':colors[2].tolist()},{'min':100,'max':1000,'rgba':colors[3].tolist()},{'min':1000,'max':None,'rgba':colors[4].tolist()}],'classification':'GeoWeb five display classes, not official WorldPop categories; no-data is fully transparent.','source':{'service':'https://worldpop.arcgis.com/arcgis/rest/services/WorldPop_Population_Density_1km/ImageServer','item':'https://www.arcgis.com/home/item.html?id=38b7672a1977426caa6cf4c62e37b777','doi':'https://doi.org/10.5258/SOTON/WP00674','dataYear':2020,'timeParameter':1577836800000,'exportRequest':export_url,'citation':'WorldPop and Center for International Earth Science Information Network (CIESIN), Columbia University (2018). Global High Resolution Population Denominators Project. WorldPop, Esri service.','license':'CC BY 4.0','licenseURL':'https://creativecommons.org/licenses/by/4.0/','accessed':datetime.date.today().isoformat(),'rawTiffSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'serviceRetirementNotice':'Official item marks mature support from August 2026 and planned retirement December 2027. Local exported snapshot does not depend on runtime service availability.'},'quality':{'validPixels':int(valid.sum()),'classPixelCounts':[int(np.sum(valid&(classes==i))) for i in range(5)],'numericMin':float(np.min(values[valid])),'numericMax':float(np.max(values[valid])),'samplePeoplePerKm2':samples},'textureSha256':hashlib.sha256(png.read_bytes()).hexdigest()}
 (out/'geoweb-population-density-regions.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
 print(json.dumps({'png':str(png),'bytes':png.stat().st_size,'quality':metadata['quality']},ensure_ascii=False,indent=2))
