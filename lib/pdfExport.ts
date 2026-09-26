import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ProfileRow, InventoryRow, Condition } from './types';
import { RDA } from './rda';
import { ImpactSummary } from './impact';

export interface HealthPdfData {
  profile: Partial<ProfileRow>;
  rda: RDA;
  tdee: number;
  bmi: number;
  bmiCategory: string;
  inventory: InventoryRow[];
  impact: ImpactSummary;
  generatedAt?: string;
}

export function buildHealthReportHtml(data: HealthPdfData): string {
  const {
    profile,
    rda,
    tdee,
    bmi,
    bmiCategory,
    inventory,
    impact,
    generatedAt = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  } = data;

  const conditionsList =
    profile.conditions && profile.conditions.length > 0
      ? profile.conditions
          .map((c: Condition) => {
            const label = c.replace('_', ' ').toUpperCase();
            return `<span class="badge condition-badge">${label}</span>`;
          })
          .join(' ')
      : '<span class="badge condition-badge neutral">None Diagnosed</span>';

  const inventoryRows =
    inventory && inventory.length > 0
      ? inventory
          .slice(0, 30)
          .map((item) => {
            const freshnessPct = Math.round((item.freshness_score ?? 0.8) * 100);
            const freshnessClass =
              freshnessPct > 70 ? 'fresh-high' : freshnessPct > 40 ? 'fresh-med' : 'fresh-low';
            
            // Calculate days remaining if expires_at is present
            let daysText = '7 days';
            if (item.expires_at) {
              const diffMs = new Date(item.expires_at).getTime() - Date.now();
              const diffDays = Math.max(1, Math.round(diffMs / 86400000));
              daysText = `${diffDays} days`;
            }

            return `
              <tr>
                <td style="font-weight: 600;">${item.name}</td>
                <td>${item.quantity} ${item.unit || 'pcs'}</td>
                <td>${daysText}</td>
                <td><span class="badge ${freshnessClass}">${freshnessPct}%</span></td>
              </tr>
            `;
          })
          .join('')
      : '<tr><td colspan="4" style="text-align: center; color: #888;">No items in pantry</td></tr>';

  const wasteDivertedKg = ((impact.mealsRescued || 0) * 0.4).toFixed(1);
  const co2PreventedKg = (impact.totalCo2eAvoided || 0).toFixed(1);
  const moneySavedUsd = ((impact.mealsRescued || 0) * 6.5).toFixed(0);

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Nourish Clinical & Waste Reduction Report</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            background-color: #ffffff;
            line-height: 1.5;
            padding: 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #02332D;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .logo-title {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #02332D;
            text-transform: uppercase;
          }
          .logo-subtitle {
            font-size: 11px;
            letter-spacing: 2px;
            color: #65836C;
            text-transform: uppercase;
            font-weight: 700;
            margin-top: 4px;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #666;
          }
          .grid-2 {
            display: flex;
            gap: 20px;
            margin-bottom: 24px;
          }
          .card {
            flex: 1;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            background-color: #fafbfc;
          }
          .card-title {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #02332D;
            margin-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
          }
          .metric-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 13px;
            border-bottom: 1px dashed #edf2f7;
          }
          .metric-row:last-child {
            border-bottom: none;
          }
          .metric-label {
            color: #555;
          }
          .metric-val {
            font-weight: 700;
            color: #111;
          }
          .badges-wrap {
            margin-top: 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .condition-badge {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .condition-badge.neutral {
            background-color: #f1f5f9;
            color: #475569;
          }
          .fresh-high {
            background-color: #dcfce7;
            color: #166534;
          }
          .fresh-med {
            background-color: #fef9c3;
            color: #854d0e;
          }
          .fresh-low {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .impact-grid {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
          }
          .impact-stat {
            flex: 1;
            background: #02332D;
            color: #ffffff;
            padding: 14px 10px;
            border-radius: 8px;
            text-align: center;
          }
          .impact-num {
            font-size: 20px;
            font-weight: 800;
            color: #F3B000;
          }
          .impact-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 4px;
            opacity: 0.9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 8px;
          }
          th, td {
            text-align: left;
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #f1f5f9;
            color: #02332D;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.5px;
          }
          .section-heading {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #02332D;
            margin-bottom: 8px;
          }
          .disclaimer {
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #718096;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div>
            <div class="logo-title">Nourish</div>
            <div class="logo-subtitle">Clinical Dietary & Waste Intelligence Report</div>
          </div>
          <div class="meta-box">
            <div><strong>Report Date:</strong> ${generatedAt}</div>
            <div><strong>Patient / User:</strong> ${profile.name || 'Anonymous User'}</div>
            <div><strong>System:</strong> Nourish OS / NSGA-II Core</div>
          </div>
        </div>

        <!-- Impact Highlights Banner -->
        <div class="section-heading">Waste Diversion & Ecological Footprint</div>
        <div class="impact-grid">
          <div class="impact-stat">
            <div class="impact-num">${impact.mealsRescued || 0}</div>
            <div class="impact-label">Meals Rescued</div>
          </div>
          <div class="impact-stat">
            <div class="impact-num">${wasteDivertedKg} kg</div>
            <div class="impact-label">Waste Diverted</div>
          </div>
          <div class="impact-stat">
            <div class="impact-num">${co2PreventedKg} kg</div>
            <div class="impact-label">CO2e Prevented</div>
          </div>
          <div class="impact-stat">
            <div class="impact-num">$${moneySavedUsd}</div>
            <div class="impact-label">Money Saved</div>
          </div>
        </div>

        <!-- Profile & Clinical Biometrics -->
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Biometric Profile</div>
            <div class="metric-row">
              <span class="metric-label">Age & Sex</span>
              <span class="metric-val">${profile.age || '--'} yrs · ${(profile.sex || 'female').toUpperCase()}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Weight & Height</span>
              <span class="metric-val">${profile.weight_kg || '--'} kg · ${profile.height_cm || '--'} cm</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">BMI</span>
              <span class="metric-val">${bmi.toFixed(1)} (${bmiCategory})</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Activity Level</span>
              <span class="metric-val">${(profile.activity_level || 'moderate').toUpperCase()}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Est. TDEE</span>
              <span class="metric-val">${Math.round(tdee)} kcal/day</span>
            </div>
            <div style="margin-top: 10px;">
              <span class="metric-label" style="font-size: 11px;">Clinical Conditions:</span>
              <div class="badges-wrap">${conditionsList}</div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Recommended Dietary Allowance (RDA)</div>
            <div class="metric-row">
              <span class="metric-label">Calories Target</span>
              <span class="metric-val">${Math.round(rda.kcal)} kcal</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Protein Target</span>
              <span class="metric-val">${Math.round(rda.proteinG)} g</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Carbohydrates Target</span>
              <span class="metric-val">${Math.round(rda.carbG)} g</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Total Fats Target</span>
              <span class="metric-val">${Math.round(rda.fatG)} g</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Dietary Fiber</span>
              <span class="metric-val">${Math.round(rda.fiberG)} g</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Sodium Upper Limit</span>
              <span class="metric-val">${Math.round(rda.sodium)} mg</span>
            </div>
          </div>
        </div>

        <!-- Current Pantry Inventory -->
        <div class="section-heading">Current Pantry & Freshness Status</div>
        <table>
          <thead>
            <tr>
              <th>Food Item</th>
              <th>Quantity</th>
              <th>Estimated Shelf Life</th>
              <th>Freshness Score</th>
            </tr>
          </thead>
          <tbody>
            ${inventoryRows}
          </tbody>
        </table>

        <!-- Clinical Disclaimer -->
        <div class="disclaimer">
          <strong>Clinical & Nutritional Notice:</strong> This report was compiled by Nourish Intelligent Dietary Systems.
          The Recommended Dietary Allowances (RDA) and Total Daily Energy Expenditure (TDEE) are algorithmic estimations
          derived from the Mifflin-St Jeor equation and Institute of Medicine guidelines, adjusted for diagnosed comorbidities.
          This document is designed for personal meal tracking, household waste minimization, and lifestyle optimization.
          It does not replace personalized medical advice, diagnosis, or pharmacotherapy from a licensed physician or registered dietitian.
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates the PDF file from the data payload and returns its local file URI.
 */
export async function generateHealthPdf(data: HealthPdfData): Promise<string> {
  const html = buildHealthReportHtml(data);
  const file = await Print.printToFileAsync({
    html,
    base64: false,
  });
  return file.uri;
}

/**
 * Generates and immediately opens the native OS share/save dialog for the PDF.
 */
export async function shareHealthPdf(data: HealthPdfData): Promise<void> {
  const uri = await generateHealthPdf(data);
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Nourish Health & Waste Report',
      UTI: 'com.adobe.pdf',
    });
  } else {
    // If sharing not available (e.g. web), use print dialog
    await Print.printAsync({ html: buildHealthReportHtml(data) });
  }
}
