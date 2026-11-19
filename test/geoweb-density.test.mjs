import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DENSITY_CLASSES,densityClass} from '../src/components/globeDensity.js';
import {readFileSync} from 'node:fs';
test('regional density thresholds include exact class boundaries and reject missing values',()=>{for(const [value,index] of [[0,0],[0.99,0],[1,1],[9.99,1],[10,2],[99.99,2],[100,3],[999.9,3],[1000,4],[10000,4]])assert.equal(densityClass(value),index);for(const value of [null,undefined,-1,NaN,Infinity])assert.equal(densityClass(value),-1);});
test('legend colors and thresholds match the actual gridded texture metadata',()=>{const data=JSON.parse(readFileSync(new URL('../public/lab-data/geoweb-population-density-regions.json',import.meta.url)));assert.deepEqual(data.classes.map(c=>c.rgba.slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('')),DENSITY_CLASSES.map(c=>c.color.slice(1)));assert.deepEqual(data.classes.map(c=>c.max??Infinity),DENSITY_CLASSES.map(c=>c.max));assert.equal(data.year,2020);assert.equal(data.crs,'EPSG:4326');});
