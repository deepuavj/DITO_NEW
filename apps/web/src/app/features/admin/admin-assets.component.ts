import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AssetService, type CreateAssetDto, type CreateCategoryDto } from '../../core/services/asset.service';
import type { Asset, Category } from '../../core/models/asset.models';

type SnapSurface = 'floor' | 'wall' | 'ceiling' | 'surface' | '';

interface AssetForm {
  name: string; category: string; glbUrl: string; glbFilename: string;
  thumbnailUrl: string; tags: string; isPublic: boolean;
  snapTo: SnapSurface; metadataRaw: string;
}
interface CatForm { name: string; icon: string; color: string; }

function emptyAssetForm(defaultCat = ''): AssetForm {
  return { name: '', category: defaultCat, glbUrl: '', glbFilename: '', thumbnailUrl: '', tags: '', isPublic: true, snapTo: 'floor', metadataRaw: '{}' };
}
function emptyCatForm(): CatForm { return { name: '', icon: '📦', color: '#6B7280' }; }

@Component({
  selector: 'app-admin-assets',
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display:flex; height:100vh; background:#F8FAFF; overflow:hidden; }
    .sidebar { position:fixed; left:0; top:0; bottom:0; width:56px; background:white; border-right:1px solid rgba(0,0,0,.06); box-shadow:4px 0 24px rgba(0,0,0,.04); transition:width 300ms cubic-bezier(.4,0,.2,1); overflow:hidden; display:flex; flex-direction:column; z-index:40; }
    .sidebar:hover { width:220px; }
    .nav-item { display:flex; align-items:center; gap:12px; padding:10px 16px; border-radius:12px; margin:2px 8px; cursor:pointer; transition:background 200ms; white-space:nowrap; color:#6E6E73; font-size:14px; border:none; background:transparent; text-align:left; width:calc(100% - 16px); }
    .nav-item:hover { background:#F5F7FF; color:#1D1D1F; }
    .nav-item.active { background:#EFF6FF; color:#2563EB; font-weight:600; }
    .nav-item .icon { font-size:18px; flex-shrink:0; width:24px; text-align:center; }
    .main { margin-left:56px; flex:1; overflow-y:auto; padding:28px; }
    .page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
    .page-title { font-size:20px; font-weight:700; color:#1D1D1F; }
    .page-sub { font-size:12px; color:#6B7280; margin-top:2px; }
    .tabs { display:flex; gap:2px; border-bottom:2px solid #F3F4F6; margin-bottom:20px; }
    .tab { padding:8px 18px; border:none; background:none; font-size:14px; color:#6B7280; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; font-weight:500; }
    .tab.active { color:#2563EB; border-bottom-color:#2563EB; }
    .toolbar { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
    .search-input { flex:1; min-width:180px; border:1.5px solid #E5E7EB; border-radius:9px; padding:8px 13px; font-size:13px; color:#1D1D1F; outline:none; background:white; }
    .search-input:focus { border-color:#2563EB; }
    .filter-select { border:1.5px solid #E5E7EB; border-radius:9px; padding:8px 13px; font-size:13px; color:#1D1D1F; outline:none; background:white; cursor:pointer; }
    .btn-primary { padding:8px 18px; border:none; border-radius:9px; background:#2563EB; color:white; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap; }
    .btn-primary:hover { background:#1D4ED8; }
    .btn-primary:disabled { opacity:.6; cursor:not-allowed; }
    .btn-danger { padding:8px 18px; border:none; border-radius:9px; background:#DC2626; color:white; font-size:13px; font-weight:600; cursor:pointer; }
    .btn-danger:disabled { opacity:.6; cursor:not-allowed; }
    table { width:100%; border-collapse:collapse; background:white; border-radius:14px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.06); font-size:13px; }
    thead tr { background:#F9FAFB; }
    th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; color:#6B7280; letter-spacing:.06em; text-transform:uppercase; border-bottom:1px solid #F3F4F6; white-space:nowrap; }
    td { padding:12px 14px; color:#374151; border-bottom:1px solid #F9FAFB; vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:#FAFBFF; }
    .badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-blue { background:#EFF6FF; color:#2563EB; }
    .badge-green { background:#ECFDF5; color:#059669; }
    .badge-gray { background:#F3F4F6; color:#6B7280; }
    .badge-red { background:#FEF2F2; color:#DC2626; }
    .thumb { width:38px; height:38px; border-radius:8px; background:#F3F4F6; display:flex; align-items:center; justify-content:center; font-size:16px; overflow:hidden; flex-shrink:0; }
    .thumb img { width:100%; height:100%; object-fit:cover; }
    .action-btn { padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:none; }
    .action-btn:disabled { opacity:.5; cursor:not-allowed; }
    .edit-btn { background:#EFF6FF; color:#2563EB; }
    .edit-btn:hover:not(:disabled) { background:#DBEAFE; }
    .del-btn { background:#FEF2F2; color:#DC2626; margin-left:5px; }
    .del-btn:hover:not(:disabled) { background:#FEE2E2; }
    .empty-state { text-align:center; padding:50px 0; color:#9CA3AF; }
    .loading-row td { color:#9CA3AF; text-align:center; }
    /* Pagination */
    .pagination { display:flex; align-items:center; justify-content:space-between; margin-top:16px; font-size:13px; }
    .pagination-info { color:#6B7280; }
    .pagination-btns { display:flex; align-items:center; gap:4px; }
    .pg-btn { min-width:32px; height:32px; padding:0 10px; border:1.5px solid #E5E7EB; border-radius:7px; background:white; color:#374151; font-size:13px; font-weight:500; cursor:pointer; transition:all 130ms; }
    .pg-btn:hover:not(:disabled) { border-color:#2563EB; color:#2563EB; }
    .pg-btn.active { background:#2563EB; color:white; border-color:#2563EB; }
    .pg-btn:disabled { opacity:.4; cursor:not-allowed; }
    /* Modal */
    .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.45); backdrop-filter:blur(4px); z-index:100; display:flex; align-items:center; justify-content:center; padding:20px; }
    .modal-card { background:white; border-radius:18px; padding:26px 30px; width:100%; max-width:560px; box-shadow:0 32px 80px rgba(0,0,0,.2); max-height:92vh; overflow-y:auto; }
    .modal-title { font-size:17px; font-weight:700; color:#1D1D1F; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; }
    .modal-close { background:none; border:none; font-size:18px; color:#9CA3AF; cursor:pointer; }
    .fg { margin-bottom:14px; }
    .fl { display:block; font-size:11px; font-weight:700; color:#374151; margin-bottom:5px; }
    .fi, .fs, .ft { width:100%; box-sizing:border-box; border:1.5px solid #E5E7EB; border-radius:9px; padding:8px 12px; font-size:13px; color:#1D1D1F; outline:none; transition:border-color 200ms; }
    .ft { min-height:120px; font-family:monospace; font-size:12px; resize:vertical; }
    .fi:focus,.fs:focus,.ft:focus { border-color:#2563EB; }
    .fi.err,.ft.err { border-color:#EF4444; }
    .toggle-row { display:flex; align-items:center; gap:9px; }
    .toggle-row input { width:16px; height:16px; cursor:pointer; accent-color:#2563EB; }
    .modal-actions { display:flex; gap:8px; margin-top:20px; justify-content:flex-end; }
    .btn-cancel { padding:8px 18px; border:1px solid #E5E7EB; border-radius:9px; background:white; color:#6B7280; font-size:13px; font-weight:500; cursor:pointer; }
    .error-msg { color:#DC2626; font-size:12px; margin-top:4px; }
    .json-hint { font-size:11px; color:#9CA3AF; margin-top:4px; }
    .del-confirm { background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:14px 16px; margin-bottom:14px; font-size:13px; color:#374151; }
    .del-confirm strong { color:#DC2626; }
    .cat-color-row { display:flex; gap:10px; align-items:center; }
    .cat-swatch { width:36px; height:36px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
    .sort-order { width:54px; }
    /* GLB upload */
    .glb-drop { border:2px dashed #E5E7EB; border-radius:10px; padding:18px; text-align:center; cursor:pointer; transition:all 150ms; background:#FAFAFA; }
    .glb-drop:hover,.glb-drop.over { border-color:#2563EB; background:#EFF6FF; }
    .glb-drop.has-file { border-color:#10B981; background:#F0FDF4; }
    .glb-drop-icon { font-size:28px; margin-bottom:6px; }
    .glb-drop-text { font-size:13px; font-weight:600; color:#374151; }
    .glb-drop-sub { font-size:11px; color:#9CA3AF; margin-top:3px; }
    .glb-file-row { display:flex; align-items:center; gap:10px; padding:10px 12px; background:#F0FDF4; border:1.5px solid #10B981; border-radius:9px; }
    .glb-file-icon { font-size:20px; }
    .glb-file-name { flex:1; font-size:12px; font-weight:600; color:#065F46; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .glb-file-remove { background:none; border:none; color:#EF4444; cursor:pointer; font-size:16px; padding:0; }
    .upload-progress { height:4px; background:#E5E7EB; border-radius:2px; overflow:hidden; margin-top:8px; }
    .upload-progress-bar { height:100%; background:#2563EB; border-radius:2px; transition:width 200ms; }
  `],
  template: `
    <!-- Asset Modal -->
    @if (showAssetModal()) {
      <div class="modal-backdrop" (click)="closeModals()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <div class="modal-title">
            {{ editAssetId() ? 'Edit Asset' : 'Add New Asset' }}
            <button class="modal-close" (click)="closeModals()">✕</button>
          </div>
          <div class="fg">
            <label class="fl">Name *</label>
            <input class="fi" [(ngModel)]="assetForm.name" placeholder="e.g. Modern 3-Seater Sofa" />
          </div>
          <div class="fg">
            <label class="fl">Category *</label>
            <select class="fs" [(ngModel)]="assetForm.category">
              <option value="">— select category —</option>
              @for (c of categories(); track c.id) {
                <option [value]="c.name">{{ c.icon }} {{ c.name }}</option>
              }
            </select>
          </div>
          <div class="fg">
            <label class="fl">3D Model (GLB / GLTF) <span style="color:#9CA3AF;font-weight:400">— leave empty for procedural mesh</span></label>
            @if (assetForm.glbUrl) {
              <div class="glb-file-row">
                <span class="glb-file-icon">📦</span>
                <span class="glb-file-name" [title]="assetForm.glbUrl">{{ assetForm.glbFilename || assetForm.glbUrl }}</span>
                <button class="glb-file-remove" title="Remove model" (click)="removeGlbFile()" [disabled]="glbUploading()">✕</button>
              </div>
            } @else {
              <div class="glb-drop" [class.over]="glbDragOver" (click)="glbFileInput.click()"
                (dragover)="$event.preventDefault(); glbDragOver=true"
                (dragleave)="glbDragOver=false"
                (drop)="onGlbDrop($event)">
                <div class="glb-drop-icon">{{ glbUploading() ? '⏳' : '🗂️' }}</div>
                <div class="glb-drop-text">{{ glbUploading() ? 'Uploading…' : 'Click or drag .glb / .gltf here' }}</div>
                <div class="glb-drop-sub">Max {{ maxMB }}MB</div>
                @if (glbUploading()) {
                  <div class="upload-progress"><div class="upload-progress-bar" [style.width]="glbProgress() + '%'"></div></div>
                }
              </div>
            }
            <input #glbFileInput type="file" accept=".glb,.gltf" style="display:none" (change)="onGlbFileChange($event)" />
            @if (glbError()) { <div class="error-msg">{{ glbError() }}</div> }
          </div>
          <div class="fg">
            <label class="fl">Thumbnail URL</label>
            <input class="fi" [(ngModel)]="assetForm.thumbnailUrl" placeholder="https://cdn.example.com/thumb.png" />
          </div>
          <div class="fg">
            <label class="fl">Tags <span style="color:#9CA3AF;font-weight:400">(comma-separated)</span></label>
            <input class="fi" [(ngModel)]="assetForm.tags" placeholder="sofa, modern, living-room" />
          </div>
          <div class="fg">
            <label class="fl">Snap To</label>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
              @for (opt of snapOptions; track opt.value) {
                <button type="button"
                  [style.border]="assetForm.snapTo === opt.value ? '2px solid #2563EB' : '2px solid #E5E7EB'"
                  [style.background]="assetForm.snapTo === opt.value ? '#EFF6FF' : 'white'"
                  [style.color]="assetForm.snapTo === opt.value ? '#2563EB' : '#6B7280'"
                  style="padding:8px 4px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:600;display:flex;flex-direction:column;align-items:center;gap:4px"
                  (click)="assetForm.snapTo = opt.value">
                  <span style="font-size:18px">{{ opt.icon }}</span>
                  {{ opt.label }}
                </button>
              }
            </div>
            <div style="font-size:11px;color:#9CA3AF;margin-top:4px">Determines where this asset attaches in the 3D scene</div>
          </div>
          <div class="fg">
            <label class="fl">Metadata JSON</label>
            <textarea class="ft" [class.err]="metaJsonError()" [(ngModel)]="assetForm.metadataRaw"
              (ngModelChange)="validateMetaJson()" rows="10"
              placeholder='{ "type": "sofa", "dimensions": { "width": 2.2, "height": 0.85, "depth": 0.95 } }'></textarea>
            @if (metaJsonError()) { <div class="error-msg">{{ metaJsonError() }}</div> }
            @else { <div class="json-hint">Valid JSON — supports type, style, dimensions, material, colors, finish, etc.</div> }
          </div>
          <div class="fg">
            <div class="toggle-row">
              <input type="checkbox" id="pub" [(ngModel)]="assetForm.isPublic" />
              <label for="pub" class="fl" style="margin:0;cursor:pointer">Publicly visible in library</label>
            </div>
          </div>
          @if (modalError()) { <div class="error-msg">{{ modalError() }}</div> }
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModals()">Cancel</button>
            <button class="btn-primary" [disabled]="saving() || !!metaJsonError()" (click)="saveAsset()">
              {{ saving() ? 'Saving…' : (editAssetId() ? 'Save Changes' : 'Create Asset') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Category Modal -->
    @if (showCatModal()) {
      <div class="modal-backdrop" (click)="closeModals()">
        <div class="modal-card" style="max-width:420px" (click)="$event.stopPropagation()">
          <div class="modal-title">
            {{ editCatId() ? 'Edit Category' : 'Add Category' }}
            <button class="modal-close" (click)="closeModals()">✕</button>
          </div>
          <div class="fg">
            <label class="fl">Name *</label>
            <input class="fi" [(ngModel)]="catForm.name" placeholder="e.g. Outdoor Furniture" />
          </div>
          <div class="fg">
            <label class="fl">Icon (emoji)</label>
            <input class="fi" [(ngModel)]="catForm.icon" placeholder="🛋" style="font-size:22px;padding:6px 10px" />
          </div>
          <div class="fg">
            <label class="fl">Colour</label>
            <div class="cat-color-row">
              <input type="color" [(ngModel)]="catForm.color" style="width:38px;height:38px;border-radius:8px;border:2px solid #E5E7EB;cursor:pointer;padding:2px" />
              <input class="fi" [(ngModel)]="catForm.color" placeholder="#6B7280" />
            </div>
          </div>
          @if (modalError()) { <div class="error-msg">{{ modalError() }}</div> }
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModals()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="saveCategory()">
              {{ saving() ? 'Saving…' : (editCatId() ? 'Save Changes' : 'Create Category') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirm -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="deleteTarget.set(null)">
        <div class="modal-card" style="max-width:400px" (click)="$event.stopPropagation()">
          <div class="modal-title">
            Delete {{ deleteTarget()!.kind === 'asset' ? 'Asset' : 'Category' }}
            <button class="modal-close" (click)="deleteTarget.set(null)">✕</button>
          </div>
          <div class="del-confirm">
            Are you sure you want to delete <strong>{{ deleteTarget()!.label }}</strong>?
            @if (deleteTarget()!.kind === 'category') {
              <br/><br/>Assets in this category will be moved to <strong>Uncategorised</strong>.
            }
            This cannot be undone.
          </div>
          @if (modalError()) { <div class="error-msg">{{ modalError() }}</div> }
          <div class="modal-actions">
            <button class="btn-cancel" (click)="deleteTarget.set(null)">Cancel</button>
            <button class="btn-danger" [disabled]="saving()" (click)="confirmDelete()">
              {{ saving() ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Sidebar -->
    <nav class="sidebar">
      <div style="display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid #F3F4F6;min-height:64px">
        <div style="width:32px;height:32px;background:#2563EB;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="color:white;font-size:14px;font-weight:700">D</span>
        </div>
        <span style="font-size:15px;font-weight:700;color:#1D1D1F;white-space:nowrap">DITO Admin</span>
      </div>
      <div style="flex:1;padding:8px 0;overflow:hidden">
        <button class="nav-item" (click)="router.navigate(['/dashboard'])">
          <span class="icon">🏠</span><span>Dashboard</span>
        </button>
        <div style="height:1px;background:#F3F4F6;margin:4px 16px"></div>
        <button class="nav-item active">
          <span class="icon">📦</span><span>Asset Management</span>
        </button>
      </div>
      <div style="border-top:1px solid #F3F4F6;padding:12px 0">
        <div style="display:flex;align-items:center;gap:12px;padding:8px 16px;white-space:nowrap;overflow:hidden">
          <div style="width:32px;height:32px;border-radius:50%;background:#FEE2E2;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span style="color:#DC2626;font-size:12px;font-weight:700">A</span>
          </div>
          <span style="font-size:13px;color:#374151;overflow:hidden;text-overflow:ellipsis;font-weight:500">{{ auth.user()?.name }}</span>
        </div>
        <button class="nav-item" (click)="auth.logout()">
          <span class="icon" style="font-size:16px">→</span><span>Sign out</span>
        </button>
      </div>
    </nav>

    <!-- Main -->
    <div class="main">
      <div class="page-header">
        <div>
          <div class="page-title">Asset Management</div>
          <div class="page-sub">Manage categories and 3D assets for the furniture library</div>
        </div>
        <button class="btn-primary" (click)="activeTab() === 'assets' ? openAddAsset() : openAddCategory()">
          + {{ activeTab() === 'assets' ? 'Add Asset' : 'Add Category' }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" [class.active]="activeTab()==='assets'" (click)="activeTab.set('assets')">
          Assets
          <span style="margin-left:6px;background:#EFF6FF;color:#2563EB;padding:1px 7px;border-radius:20px;font-size:11px;font-weight:700">{{ assetTotal() }}</span>
        </button>
        <button class="tab" [class.active]="activeTab()==='categories'" (click)="activeTab.set('categories')">
          Categories
          <span style="margin-left:6px;background:#F3F4F6;color:#6B7280;padding:1px 7px;border-radius:20px;font-size:11px;font-weight:700">{{ catTotal() }}</span>
        </button>
      </div>

      <!-- ── Assets tab ─────────────────────────────────────────────────────── -->
      @if (activeTab() === 'assets') {
        <div class="toolbar">
          <input class="search-input" type="text" placeholder="Search assets…"
            [(ngModel)]="assetSearch" (ngModelChange)="onAssetSearch()" />
          <select class="filter-select" [(ngModel)]="filterCategory" (ngModelChange)="onAssetFilter()">
            <option value="">All Categories</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.name">{{ c.icon }} {{ c.name }}</option>
            }
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Asset</th>
              <th>Category</th>
              <th>Type</th>
              <th>Dimensions (W×D×H m)</th>
              <th>Tags</th>
              <th>Vis.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (assetLoading()) {
              <tr class="loading-row"><td colspan="8" style="padding:40px;text-align:center">Loading…</td></tr>
            } @else if (assets().length === 0) {
              <tr><td colspan="8">
                <div class="empty-state">
                  <div style="font-size:36px;margin-bottom:10px">📦</div>
                  <div style="font-weight:600">No assets found</div>
                </div>
              </td></tr>
            } @else {
              @for (a of assets(); track a.id; let i = $index) {
                <tr>
                  <td style="color:#9CA3AF;font-size:11px">{{ (assetPage()-1)*pageSize + i + 1 }}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="thumb">
                        @if (a.thumbnailUrl) { <img [src]="a.thumbnailUrl" [alt]="a.name" /> }
                        @else { {{ categoryIcon(a.category) }} }
                      </div>
                      <div>
                        <div style="font-weight:600;color:#111827">{{ a.name }}</div>
                        @if (a.glbUrl) {
                          <div style="font-size:10px;color:#9CA3AF;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [title]="a.glbUrl">{{ a.glbUrl }}</div>
                        } @else {
                          <div style="font-size:10px;color:#10B981">▲ Procedural</div>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    @let catObj = categoryObj(a.category);
                    @if (catObj) {
                      <span class="badge" [style.background]="catObj.color + '22'" [style.color]="catObj.color">
                        {{ catObj.icon }} {{ a.category }}
                      </span>
                    } @else {
                      <span class="badge badge-gray">{{ a.category }}</span>
                    }
                  </td>
                  <td>
                    @if (a.metadata?.['type']) {
                      <span class="badge badge-blue">{{ a.metadata['type'] }}</span>
                    } @else { <span style="color:#D1D5DB">—</span> }
                  </td>
                  <td style="font-size:11px;color:#6B7280;white-space:nowrap">
                    @let dim = a.metadata?.['dimensions'];
                    @if (dim) { {{ dim['width'] }} × {{ dim['depth'] }} × {{ dim['height'] }} }
                    @else { <span style="color:#D1D5DB">—</span> }
                  </td>
                  <td>
                    <div style="display:flex;flex-wrap:wrap;gap:3px">
                      @for (t of (a.tags ?? []).slice(0,3); track t) {
                        <span class="badge badge-gray">{{ t }}</span>
                      }
                      @if ((a.tags ?? []).length > 3) {
                        <span class="badge badge-gray">+{{ (a.tags ?? []).length - 3 }}</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="badge" [class.badge-green]="a.isPublic" [class.badge-red]="!a.isPublic">
                      {{ a.isPublic ? '✓ Public' : '✕ Private' }}
                    </span>
                  </td>
                  <td style="white-space:nowrap">
                    <button class="action-btn edit-btn" (click)="openEditAsset(a)">Edit</button>
                    <button class="action-btn del-btn" (click)="deleteTarget.set({kind:'asset',id:a.id,label:a.name})">Del</button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <div class="pagination">
          <span class="pagination-info">
            @if (assetTotal() > 0) {
              Showing {{ (assetPage()-1)*pageSize + 1 }}–{{ min(assetPage()*pageSize, assetTotal()) }} of {{ assetTotal() }} assets
            } @else { No assets }
          </span>
          <div class="pagination-btns">
            <button class="pg-btn" [disabled]="assetPage() === 1" (click)="assetGoPage(-1)">‹</button>
            @for (p of assetPageNumbers(); track p) {
              @if (p === -1) {
                <span style="padding:0 4px;color:#9CA3AF">…</span>
              } @else {
                <button class="pg-btn" [class.active]="p === assetPage()" (click)="assetPage.set(p); loadAssets()">{{ p }}</button>
              }
            }
            <button class="pg-btn" [disabled]="assetPage() * pageSize >= assetTotal()" (click)="assetGoPage(1)">›</button>
          </div>
        </div>
      }

      <!-- ── Categories tab ─────────────────────────────────────────────────── -->
      @if (activeTab() === 'categories') {
        <div class="toolbar">
          <input class="search-input" type="text" placeholder="Search categories…"
            [(ngModel)]="catSearch" (ngModelChange)="onCatSearch()" />
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:36px">#</th>
              <th>Category</th>
              <th>Icon</th>
              <th>Colour</th>
              <th>Sort Order</th>
              <th>Assets</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (catLoading()) {
              <tr class="loading-row"><td colspan="8" style="padding:40px;text-align:center">Loading…</td></tr>
            } @else if (pagedCategories().length === 0) {
              <tr><td colspan="8">
                <div class="empty-state">
                  <div style="font-size:36px;margin-bottom:10px">🗂️</div>
                  <div style="font-weight:600">No categories found</div>
                </div>
              </td></tr>
            } @else {
              @for (c of pagedCategories(); track c.id; let i = $index) {
                <tr>
                  <td style="color:#9CA3AF;font-size:11px">{{ (catPage()-1)*pageSize + i + 1 }}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="cat-swatch" [style.background]="c.color + '22'">{{ c.icon }}</div>
                      <span style="font-weight:600;color:#111827">{{ c.name }}</span>
                    </div>
                  </td>
                  <td style="font-size:20px">{{ c.icon }}</td>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="width:18px;height:18px;border-radius:4px;flex-shrink:0" [style.background]="c.color"></div>
                      <span style="font-size:12px;color:#6B7280;font-family:monospace">{{ c.color }}</span>
                    </div>
                  </td>
                  <td style="color:#6B7280;font-size:13px">{{ c.sortOrder }}</td>
                  <td>
                    <span class="badge badge-blue">{{ assetCountMap()[c.name] ?? 0 }}</span>
                  </td>
                  <td style="font-size:11px;color:#9CA3AF;white-space:nowrap">{{ c.createdAt | date:'dd MMM yyyy' }}</td>
                  <td style="white-space:nowrap">
                    <button class="action-btn edit-btn" (click)="openEditCategory(c)">Edit</button>
                    <button class="action-btn del-btn" (click)="deleteTarget.set({kind:'category',id:c.id,label:c.name})">Del</button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <div class="pagination">
          <span class="pagination-info">
            @if (catTotal() > 0) {
              Showing {{ (catPage()-1)*pageSize + 1 }}–{{ min(catPage()*pageSize, catTotal()) }} of {{ catTotal() }} categories
            } @else { No categories }
          </span>
          <div class="pagination-btns">
            <button class="pg-btn" [disabled]="catPage() === 1" (click)="catGoPage(-1)">‹</button>
            @for (p of catPageNumbers(); track p) {
              @if (p === -1) {
                <span style="padding:0 4px;color:#9CA3AF">…</span>
              } @else {
                <button class="pg-btn" [class.active]="p === catPage()" (click)="catPage.set(p)">{{ p }}</button>
              }
            }
            <button class="pg-btn" [disabled]="catPage() * pageSize >= catTotal()" (click)="catGoPage(1)">›</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminAssetsComponent implements OnInit {
  readonly auth     = inject(AuthService);
  readonly assetSvc = inject(AssetService);
  readonly router   = inject(Router);
  readonly pageSize = 15;
  readonly min = Math.min;

  activeTab = signal<'assets' | 'categories'>('assets');

  // ── Assets state ────────────────────────────────────────────────────────────
  assets      = signal<Asset[]>([]);
  assetTotal  = signal(0);
  assetLoading = signal(true);
  assetPage   = signal(1);
  assetSearch = '';
  filterCategory = '';

  // ── Categories state ────────────────────────────────────────────────────────
  categories  = signal<Category[]>([]);
  catTotal    = signal(0);
  catLoading  = signal(true);
  catPage     = signal(1);
  catSearch   = '';

  // Asset count per category name (loaded separately for accuracy)
  assetCountMap = signal<Record<string, number>>({});

  // ── Modal state ─────────────────────────────────────────────────────────────
  showAssetModal = signal(false);
  showCatModal   = signal(false);
  editAssetId    = signal<string | null>(null);
  editCatId      = signal<string | null>(null);
  saving         = signal(false);
  modalError     = signal('');
  metaJsonError  = signal('');
  assetForm: AssetForm = emptyAssetForm();
  catForm: CatForm     = emptyCatForm();
  deleteTarget = signal<{ kind: 'asset' | 'category'; id: string; label: string } | null>(null);

  // Filtered + paged categories (client-side — categories are few)
  readonly filteredCategories = computed(() => {
    const q = this.catSearch.toLowerCase().trim();
    return q ? this.categories().filter(c => c.name.toLowerCase().includes(q)) : this.categories();
  });
  readonly pagedCategories = computed(() => {
    const start = (this.catPage() - 1) * this.pageSize;
    return this.filteredCategories().slice(start, start + this.pageSize);
  });

  ngOnInit() {
    this.loadCategories();
    this.loadAssets();
    this.loadAssetCounts();
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  loadCategories() {
    this.catLoading.set(true);
    this.assetSvc.listCategories().subscribe({
      next: cats => {
        this.categories.set(cats);
        this.catTotal.set(cats.length);
        this.catLoading.set(false);
      },
      error: () => this.catLoading.set(false),
    });
  }

  loadAssets() {
    this.assetLoading.set(true);
    const p: Record<string, string | number> = { page: this.assetPage(), limit: this.pageSize };
    if (this.assetSearch.trim()) p['search'] = this.assetSearch.trim();
    if (this.filterCategory) p['category'] = this.filterCategory;
    this.assetSvc.list(p as any).subscribe({
      next: r => {
        this.assets.set(r.data ?? []);
        this.assetTotal.set(r.meta?.total ?? 0);
        this.assetLoading.set(false);
      },
      error: () => this.assetLoading.set(false),
    });
  }

  /** Load all assets once (limit=500) to build accurate per-category counts */
  private loadAssetCounts() {
    this.assetSvc.list({ limit: 500 } as any).subscribe({
      next: r => {
        const map: Record<string, number> = {};
        for (const a of r.data ?? []) {
          map[a.category] = (map[a.category] ?? 0) + 1;
        }
        this.assetCountMap.set(map);
      },
    });
  }

  // ── Pagination helpers ───────────────────────────────────────────────────────

  assetGoPage(dir: 1 | -1) { this.assetPage.update(p => p + dir); this.loadAssets(); }
  catGoPage(dir: 1 | -1)   { this.catPage.update(p => p + dir); }

  onAssetSearch() { this.assetPage.set(1); this.loadAssets(); }
  onAssetFilter() { this.assetPage.set(1); this.loadAssets(); }
  onCatSearch()   { this.catPage.set(1); }

  assetPageNumbers(): number[] { return this.buildPages(this.assetPage(), Math.ceil(this.assetTotal() / this.pageSize)); }
  catPageNumbers():   number[] { return this.buildPages(this.catPage(),   Math.ceil(this.filteredCategories().length / this.pageSize)); }

  private buildPages(current: number, total: number): number[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  categoryIcon(name: string) { return this.categories().find(c => c.name === name)?.icon ?? '📦'; }
  categoryObj(name: string)  { return this.categories().find(c => c.name === name) ?? null; }

  validateMetaJson() {
    try { JSON.parse(this.assetForm.metadataRaw); this.metaJsonError.set(''); }
    catch { this.metaJsonError.set('Invalid JSON — check syntax.'); }
  }

  // ── GLB upload ────────────────────────────────────────────────────────────────
  glbUploading = signal(false);
  glbProgress  = signal(0);
  glbError     = signal('');
  glbDragOver  = false;
  readonly maxMB = Math.round((100 * 1024 * 1024) / (1024 * 1024)); // from config default 100MB

  onGlbFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (file) this.uploadGlbFile(file);
  }

  onGlbDrop(e: DragEvent): void {
    e.preventDefault(); this.glbDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.uploadGlbFile(file);
  }

  private uploadGlbFile(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf') {
      this.glbError.set('Only .glb and .gltf files are supported.'); return;
    }
    this.glbUploading.set(true); this.glbError.set(''); this.glbProgress.set(10);

    // Animate progress while uploading
    const tick = setInterval(() => this.glbProgress.update(p => Math.min(p + 8, 85)), 200);

    this.assetSvc.uploadGlb(file).subscribe({
      next: result => {
        clearInterval(tick);
        this.glbProgress.set(100);
        this.assetForm.glbUrl = result.url;
        this.assetForm.glbFilename = file.name;
        setTimeout(() => { this.glbUploading.set(false); this.glbProgress.set(0); }, 400);
      },
      error: (err: any) => {
        clearInterval(tick);
        this.glbUploading.set(false); this.glbProgress.set(0);
        this.glbError.set(err?.error?.message ?? 'Upload failed — check file size and format.');
      },
    });
  }

  removeGlbFile(): void {
    // Optionally delete from server if it was just uploaded (has /uploads/ path)
    const url = this.assetForm.glbUrl;
    if (url?.includes('/uploads/')) {
      const filename = url.split('/').pop()!;
      this.assetSvc.deleteGlbFile(filename).subscribe({ error: () => {} });
    }
    this.assetForm.glbUrl = '';
    this.assetForm.glbFilename = '';
    this.glbError.set('');
  }

  readonly snapOptions: { value: SnapSurface; label: string; icon: string }[] = [
    { value: 'floor',   label: 'Floor',   icon: '⬇️' },
    { value: 'wall',    label: 'Wall',    icon: '↔️' },
    { value: 'ceiling', label: 'Ceiling', icon: '⬆️' },
    { value: 'surface', label: 'Surface', icon: '📐' },
  ];

  // ── Asset modal ──────────────────────────────────────────────────────────────

  openAddAsset() {
    this.editAssetId.set(null);
    this.assetForm = emptyAssetForm(this.filterCategory || (this.categories()[0]?.name ?? ''));
    this.modalError.set(''); this.metaJsonError.set(''); this.glbError.set('');
    this.showAssetModal.set(true);
  }

  openEditAsset(a: Asset) {
    this.editAssetId.set(a.id);
    const existingSnap = (a.metadata?.['snapRules'] as any)?.surface as SnapSurface | undefined;
    const glbUrl = a.glbUrl ?? '';
    this.assetForm = {
      name: a.name, category: a.category, glbUrl,
      glbFilename: glbUrl ? glbUrl.split('/').pop()! : '',
      thumbnailUrl: a.thumbnailUrl ?? '', tags: (a.tags ?? []).join(', '),
      isPublic: a.isPublic,
      snapTo: existingSnap ?? 'floor',
      metadataRaw: JSON.stringify(a.metadata ?? {}, null, 2),
    };
    this.modalError.set(''); this.metaJsonError.set(''); this.glbError.set('');
    this.showAssetModal.set(true);
  }

  saveAsset() {
    const { name, category, glbUrl, thumbnailUrl, tags, isPublic, snapTo, metadataRaw } = this.assetForm;
    if (!name.trim()) { this.modalError.set('Name is required.'); return; }
    if (!category)    { this.modalError.set('Category is required.'); return; }
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(metadataRaw || '{}'); }
    catch { this.modalError.set('Fix the JSON metadata before saving.'); return; }

    // Write snapRules into metadata
    if (snapTo) {
      metadata['snapRules'] = { surface: snapTo };
    } else {
      delete metadata['snapRules'];
    }

    const dto: CreateAssetDto = {
      name: name.trim(), category,
      glbUrl: glbUrl.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      isPublic, metadata,
    };

    this.saving.set(true); this.modalError.set('');
    const id = this.editAssetId();
    (id ? this.assetSvc.update(id, dto) : this.assetSvc.create(dto)).subscribe({
      next: () => {
        this.saving.set(false); this.closeModals();
        this.loadAssets(); this.loadAssetCounts();
      },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.message ?? 'Save failed.'); },
    });
  }

  // ── Category modal ───────────────────────────────────────────────────────────

  openAddCategory() {
    this.editCatId.set(null); this.catForm = emptyCatForm();
    this.modalError.set(''); this.showCatModal.set(true);
  }

  openEditCategory(c: Category) {
    this.editCatId.set(c.id);
    this.catForm = { name: c.name, icon: c.icon, color: c.color };
    this.modalError.set(''); this.showCatModal.set(true);
  }

  saveCategory() {
    if (!this.catForm.name.trim()) { this.modalError.set('Name is required.'); return; }
    this.saving.set(true); this.modalError.set('');
    const dto: CreateCategoryDto = { name: this.catForm.name.trim(), icon: this.catForm.icon, color: this.catForm.color };
    const id = this.editCatId();
    (id ? this.assetSvc.updateCategory(id, dto) : this.assetSvc.createCategory(dto)).subscribe({
      next: () => { this.saving.set(false); this.closeModals(); this.loadCategories(); },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.message ?? 'Save failed.'); },
    });
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  closeModals() {
    this.showAssetModal.set(false); this.showCatModal.set(false);
    this.deleteTarget.set(null); this.modalError.set('');
  }

  confirmDelete() {
    const t = this.deleteTarget(); if (!t) return;
    this.saving.set(true); this.modalError.set('');
    const op$ = t.kind === 'asset' ? this.assetSvc.remove(t.id) : this.assetSvc.deleteCategory(t.id);
    op$.subscribe({
      next: () => {
        this.saving.set(false); this.deleteTarget.set(null);
        if (t.kind === 'asset') { this.loadAssets(); this.loadAssetCounts(); }
        else { this.loadCategories(); this.loadAssets(); this.loadAssetCounts(); }
      },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.message ?? 'Delete failed.'); },
    });
  }
}
