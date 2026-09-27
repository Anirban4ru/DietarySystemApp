/**
 * lib/barcode.ts
 * Real-time food barcode lookup using Open Food Facts public API (ODbL / Free).
 * Resolves standard global food barcodes (UPC-A, EAN-13, EAN-8) to real product names,
 * brands, categories, and estimated shelf-life days.
 */

import { inferFreshnessOnDevice } from './ai';

export interface BarcodeLookupResult {
  found: boolean;
  name: string;
  brand?: string;
  category?: string;
  shelfLifeDays: number;
  freshness: number;
  confidence: number;
  rawBarcode: string;
}

export async function lookupBarcodeProduct(barcode: string): Promise<BarcodeLookupResult> {
  const clean = (barcode || '').trim();
  if (!clean) {
    return {
      found: false,
      name: '',
      shelfLifeDays: 14,
      freshness: 0.95,
      confidence: 0.5,
      rawBarcode: clean,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(clean)}.json`, {
      headers: {
        'User-Agent': 'NourishDietarySystem/1.0 (contact@nourishapp.dev)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data?.status === 1 && data?.product) {
        const p = data.product;
        const rawTitle = (p.product_name_en || p.product_name || p.generic_name_en || p.generic_name || '').trim();
        const brand = (p.brands ? p.brands.split(',')[0] : '').trim();

        let cleanName = rawTitle;
        if (!cleanName && brand) {
          cleanName = brand;
        } else if (brand && cleanName && !cleanName.toLowerCase().includes(brand.toLowerCase())) {
          cleanName = `${cleanName} (${brand})`;
        }

        if (cleanName) {
          const freshnessInfo = inferFreshnessOnDevice(rawTitle || brand);
          return {
            found: true,
            name: cleanName,
            brand: brand || undefined,
            category: freshnessInfo.category,
            shelfLifeDays: freshnessInfo.shelfLifeDays || 14,
            freshness: freshnessInfo.freshness || 0.95,
            confidence: 0.98,
            rawBarcode: clean,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Open Food Facts barcode lookup failed:', err);
  }

  // Graceful fallback for unlisted barcodes or offline network
  return {
    found: false,
    name: '',
    shelfLifeDays: 14,
    freshness: 0.95,
    confidence: 0.7,
    rawBarcode: clean,
  };
}
