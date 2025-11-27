import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import { requireActivePractice } from '@/lib/auth';
import { isPlatformOwner } from '@/lib/owner-guard';
import { buildRequestContext } from '@/src/lib/context/context-builder';
import { getProductService } from '@/src/services';
import { canViewProductPricing } from '@/lib/rbac';
import { decimalToNumber } from '@/lib/prisma-transforms';
import { resolveAssetUrl, isLocallyStored } from '@/src/lib/storage';
import {
  PackagingRepository,
  MediaRepository,
  DocumentRepository,
  RegulatoryRepository,
  LogisticsRepository,
  QualityRepository,
} from '@/src/repositories/products';

import { Gs1StatusBadge } from '../_components/gs1-status-badge';
import { IntegrationTypeBadge } from '../_components/integration-type-badge';
import { ProductDeleteButton, Gs1RefreshButton } from './_components/product-actions';

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { productId } = await params;
  const { session, practiceId } = await requireActivePractice();
  const ctx = await buildRequestContext();

  // Check if user is PLATFORM OWNER
  const isOwner = isPlatformOwner(session.user.email);

  if (!isOwner) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Only the platform owner can access product master data.
        </p>
      </div>
    );
  }

  // Fetch product using ProductService
  let product;
  try {
    product = await getProductService().getProductById(ctx, productId);
  } catch (error) {
    notFound();
  }

  // Fetch GS1-related data in parallel
  const [packaging, media, documents, regulatory, logistics, qualityScore] = await Promise.all([
    new PackagingRepository().findByProductId(productId),
    new MediaRepository().findByProductId(productId),
    new DocumentRepository().findByProductId(productId),
    new RegulatoryRepository().findByProductId(productId),
    new LogisticsRepository().findByProductId(productId),
    new QualityRepository().findByProductId(productId),
  ]);

  // Owner can always manage
  const canManage = isOwner;

  const canViewPricing = canViewProductPricing({
    memberships: session.user.memberships,
    practiceId,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href="/owner/product-master"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            >
              ← Back to Products
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{product.name}</h1>
          {product.brand ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">by {product.brand}</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          {canManage && product.gtin ? (
            <Gs1RefreshButton productId={product.id} />
          ) : null}
          {canManage && (product.items?.length || 0) === 0 ? (
            <ProductDeleteButton productId={product.id} />
          ) : null}
        </div>
      </div>

      {/* Quality Score Card */}
      {qualityScore ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Quality Score</h2>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${
                qualityScore.overallScore >= 80 ? 'text-green-600 dark:text-green-400' :
                qualityScore.overallScore >= 50 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {qualityScore.overallScore}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <ScoreBar label="Basic Data" score={qualityScore.basicDataScore} />
            <ScoreBar label="GS1 Verification" score={qualityScore.gs1DataScore} />
            <ScoreBar label="Media" score={qualityScore.mediaScore} />
            <ScoreBar label="Documents" score={qualityScore.documentScore} />
            <ScoreBar label="Regulatory" score={qualityScore.regulatoryScore} />
            <ScoreBar label="Packaging" score={qualityScore.packagingScore} />
          </div>
          {qualityScore.warnings && qualityScore.warnings.length > 0 ? (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Warnings:</p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-700 dark:text-amber-400">
                {qualityScore.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Product Information Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Product Information</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GTIN / Barcode</dt>
            <dd className="mt-1 font-mono text-sm text-slate-900 dark:text-slate-200">
              {product.gtin || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GS1 Status</dt>
            <dd className="mt-1">
              <Gs1StatusBadge status={product.gs1VerificationStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Brand</dt>
            <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
              {product.brand || '-'}
            </dd>
          </div>
          {product.manufacturerName ? (
            <div>
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Manufacturer</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
                {product.manufacturerName}
              </dd>
            </div>
          ) : null}
          {product.manufacturerGln ? (
            <div>
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Manufacturer GLN</dt>
              <dd className="mt-1 font-mono text-xs text-slate-900 dark:text-slate-200">
                {product.manufacturerGln}
              </dd>
            </div>
          ) : null}
          {product.gs1SyncedAt ? (
            <div>
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Last GS1 Sync</dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
                {format(product.gs1SyncedAt, 'MMM d, yyyy h:mm a')}
              </dd>
            </div>
          ) : null}
          {product.shortDescription || product.description ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</dt>
              <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                {product.shortDescription || product.description}
              </dd>
            </div>
          ) : null}
        </dl>

        {/* Medical Device Information */}
        {product.isRegulatedDevice ? (
          <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Medical Device Information</h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">Risk Class</dt>
                <dd className="mt-1 text-sm text-slate-900 dark:text-slate-200">
                  {product.deviceRiskClass || '-'}
                </dd>
              </div>
              {product.udiDi ? (
                <div>
                  <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">UDI-DI</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-900 dark:text-slate-200">
                    {product.udiDi}
                  </dd>
                </div>
              ) : null}
              {product.gmdnCode ? (
                <div>
                  <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GMDN Code</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-900 dark:text-slate-200">
                    {product.gmdnCode}
                  </dd>
                </div>
              ) : null}
              {product.tradeItemClassification ? (
                <div>
                  <dt className="text-sm font-medium text-slate-600 dark:text-slate-400">GPC Code</dt>
                  <dd className="mt-1 font-mono text-xs text-slate-900 dark:text-slate-200">
                    {product.tradeItemClassification}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>

      {/* Packaging Hierarchy */}
      {packaging.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Packaging Hierarchy</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Product packaging levels from GS1
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">GTIN</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Contains</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Dimensions</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {packaging.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {pkg.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {pkg.gtin || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                      {pkg.childCount ? `${pkg.childCount} items` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-700 dark:text-slate-300">
                      {pkg.height && pkg.width && pkg.depth 
                        ? `${pkg.height}×${pkg.width}×${pkg.depth} ${pkg.dimensionUom || 'cm'}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-700 dark:text-slate-300">
                      {pkg.grossWeight ? `${pkg.grossWeight} ${pkg.weightUom || 'kg'}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* GS1 Data Grid: Media, Documents, Regulatory, Logistics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Media Assets */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Media Assets
            <span className="ml-2 text-sm font-normal text-slate-500">({media.length})</span>
          </h2>
          {media.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No media assets available.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {media.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                    m.isPrimary 
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {m.type.replace('_', ' ')}
                  </span>
                  <a 
                    href={resolveAssetUrl(m)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate text-sky-600 hover:underline dark:text-sky-400"
                  >
                    {m.filename || 'View'}
                  </a>
                  {isLocallyStored(m) ? (
                    <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      local
                    </span>
                  ) : (
                    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      external
                    </span>
                  )}
                  {m.width && m.height ? (
                    <span className="text-xs text-slate-500">{m.width}×{m.height}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Documents */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Documents
            <span className="ml-2 text-sm font-normal text-slate-500">({documents.length})</span>
          </h2>
          {documents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No documents available.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 text-sm">
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {doc.type}
                  </span>
                  <a 
                    href={resolveAssetUrl(doc)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="truncate text-sky-600 hover:underline dark:text-sky-400"
                  >
                    {doc.title}
                  </a>
                  {isLocallyStored(doc) ? (
                    <span className="inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      local
                    </span>
                  ) : (
                    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      external
                    </span>
                  )}
                  <span className="text-xs text-slate-500 uppercase">{doc.language}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Regulatory Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Regulatory Compliance
            <span className="ml-2 text-sm font-normal text-slate-500">({regulatory.length})</span>
          </h2>
          {regulatory.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No regulatory data available.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {regulatory.map((reg) => (
                <li key={reg.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-200">{reg.authority}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      reg.status === 'COMPLIANT' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : reg.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {reg.status}
                    </span>
                  </div>
                  {reg.certificateNumber ? (
                    <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">
                      Cert: {reg.certificateNumber}
                    </p>
                  ) : null}
                  {reg.notifiedBodyName ? (
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Notified Body: {reg.notifiedBodyName}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Logistics Information */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Logistics</h2>
          {!logistics ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">No logistics data available.</p>
          ) : (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {logistics.storageTemp ? (
                <div>
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Storage Temperature</dt>
                  <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-200">{logistics.storageTemp}</dd>
                </div>
              ) : null}
              {logistics.storageHumidity ? (
                <div>
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Humidity</dt>
                  <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-200">{logistics.storageHumidity}</dd>
                </div>
              ) : null}
              {logistics.shelfLifeDays ? (
                <div>
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Shelf Life</dt>
                  <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-200">{logistics.shelfLifeDays} days</dd>
                </div>
              ) : null}
              {logistics.countryOfOrigin ? (
                <div>
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">Country of Origin</dt>
                  <dd className="mt-0.5 text-sm text-slate-900 dark:text-slate-200">{logistics.countryOfOrigin}</dd>
                </div>
              ) : null}
              {logistics.hsCode ? (
                <div>
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">HS Code</dt>
                  <dd className="mt-0.5 font-mono text-xs text-slate-900 dark:text-slate-200">{logistics.hsCode}</dd>
                </div>
              ) : null}
              {logistics.isHazardous ? (
                <div className="sm:col-span-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    ⚠️ Hazardous Material {logistics.hazardClass ? `(Class ${logistics.hazardClass})` : ''}
                  </span>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      </div>

      {/* Supplier Offers */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Supplier Offers</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Suppliers in your practice offering this product
          </p>
        </div>

        {(product.supplierItems?.length || 0) === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-200">No supplier offers yet</p>
            <p className="mt-2">
              This product is not currently offered by any suppliers in your practice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Supplier SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Integration
                  </th>
                  {canViewPricing ? (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Price
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Min Qty
                      </th>
                    </>
                  ) : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Last Sync
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {product.supplierItems?.map((catalog: any) => {
                  const unitPrice = decimalToNumber(catalog.unitPrice);

                  return (
                    <tr key={catalog.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/suppliers#${catalog.supplier.id}`}
                          className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                          {catalog.supplier.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {catalog.supplierSku || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <IntegrationTypeBadge type={catalog.integrationType} />
                      </td>
                      {canViewPricing ? (
                        <>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium text-slate-900 dark:text-slate-200">
                              {unitPrice ? `${catalog.currency} ${unitPrice.toFixed(2)}` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-slate-700 dark:text-slate-300">
                              {catalog.minOrderQty || 1}
                            </span>
                          </td>
                        </>
                      ) : null}
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600 dark:text-slate-400">
                          {catalog.lastSyncAt
                            ? format(catalog.lastSyncAt, 'MMM d, yyyy')
                            : 'Never'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Practice Usage - Items using this product */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Practice Usage</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Inventory items in your practice using this product
          </p>
        </div>

        {(product.items?.length || 0) === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600 dark:text-slate-400">
            <p className="font-medium text-slate-900 dark:text-slate-200">No items yet</p>
            <p className="mt-2">
              This product is not yet used in any inventory items in your practice.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Total Stock
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    Status
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {product.items?.map((item: any) => {
                  const totalStock = item.inventory.reduce(
                    (sum: number, inv: any) => sum + inv.quantity,
                    0
                  );
                  const lowStockLocations = item.inventory.filter(
                    (inv: any) => inv.reorderPoint !== null && inv.quantity < inv.reorderPoint
                  );
                  const isLowStock = lowStockLocations.length > 0;

                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {item.sku || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {totalStock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isLowStock ? (
                          <span className="inline-block rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-block rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/inventory#${item.id}`}
                          className="text-sm font-medium text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Score bar component for quality score display
 */
function ScoreBar({ label, score }: { label: string; score: number }) {
  const getColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500 dark:bg-green-400';
    if (score >= 50) return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-red-500 dark:bg-red-400';
  };

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-900 dark:text-slate-200">{score}</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all ${getColorClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
