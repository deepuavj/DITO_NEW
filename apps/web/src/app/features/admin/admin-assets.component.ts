import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AssetService, type CreateAssetDto, type CreateCategoryDto } from '../../core/services/asset.service';
import type { Asset, Category } from '../../core/models/asset.models';

interface AssetForm {
  name: string; category: string; glbUrl: string;
  thumbnailUrl: string; tags: string; isPublic: boolean; metadataRaw: string;
}
interface CatForm { name: string; icon: string; color: string; }

function emptyAssetForm(defaultCat = ''): AssetForm {
  return { name: '', category: defaultCat, glbUrl: '', thumbnailUrl: '', tags: '', isPublic: true, metadataRaw: '{}' };
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
    th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; color:#6B7280; letter-spacing:.06em; text-transform:uppercase; border-bottom:1px solid #F3F4F6; }
    td { padding:12px 14px; color:#374151; border-bottom:1px solid #F9FAFB; vertical-align:middle; }
    tr:last-child td { border-bottom:none; }
    tr:hover td { background:#FAFBFF; }
    .badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; }
    .badge-blue { background:#EFF6FF; color:#2563EB; }
    .badge-green { background:#ECFDF5; color:#059669; }
    .badge-gray { background:#F3F4F6; color:#6B7280; }
    .thumb { width:38px; height:38px; border-radius:8px; background:#F3F4F6; display:flex; align-items:center; justify-content:center; font-size:16px; overflow:hidden; flex-shrink:0; }
    .thumb img { width:100%; height:100%; object-fit:cover; }
    .action-btn { padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; border:none; }
    .edit-btn { background:#EFF6FF; color:#2563EB; }
    .edit-btn:hover { background:#DBEAFE; }
    .del-btn { background:#FEF2F2; color:#DC2626; margin-left:5px; }
    .del-btn:hover { background:#FEE2E2; }
    .empty-state { text-align:center; padding:50px 0; color:#9CA3AF; }
    /* Category cards */
    .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:14px; margin-bottom:20px; }
    .cat-card { background:white; border-radius:14px; border:1px solid rgba(0,0,0,.06); padding:16px; display:flex; align-items:center; gap:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); }
    .cat-dot { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
    .cat-name { font-weight:600; font-size:13px; color:#1D1D1F; }
    .cat-actions { margin-left:auto; display:flex; gap:4px; }
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
    .color-swatch { width:38px; height:38px; border-radius:8px; border:2px solid #E5E7EB; cursor:pointer; }
    .meta-section { background:#F9FAFB; border-radius:10px; padding:12px 14px; margin-bottom:10px; font-size:12px; }
    .meta-kv { display:flex; gap:6px; margin-bottom:6px; }
    .meta-kv input { flex:1; border:1px solid #E5E7EB; border-radius:6px; padding:5px 8px; font-size:12px; outline:none; }
    .meta-kv input:focus { border-color:#2563EB; }
    .loading-row td { color:#9CA3AF; text-align:center; }
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
            <label class="fl">GLB Model URL <span style="color:#9CA3AF">(leave blank for procedural mesh)</span></label>
            <input class="fi" [(ngModel)]="assetForm.glbUrl" placeholder="https://cdn.example.com/model.glb" />
          </div>
          <div class="fg">
            <label class="fl">Thumbnail URL</label>
            <input class="fi" [(ngModel)]="assetForm.thumbnailUrl" placeholder="https://cdn.example.com/thumb.png" />
          </div>
          <div class="fg">
            <label class="fl">Tags <span style="color:#9CA3AF">(comma-separated)</span></label>
            <input class="fi" [(ngModel)]="assetForm.tags" placeholder="sofa, modern, living-room" />
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
        <div class="modal-card" style="max-width:400px" (click)="$event.stopPropagation()">
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
              <input class="fi" [(ngModel)]="catForm.color" style="flex:1" placeholder="#6B7280" />
            </div>
          </div>
          @if (modalError()) { <div class="error-msg">{{ modalError() }}</div> }
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeModals()">Cancel</button>
            <button class="btn-primary" [disabled]="saving()" (click)="saveCategory()">
              {{ saving() ? 'Saving…' : (editCatId() ? 'Save' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete Confirm -->
    @if (deleteTarget()) {
      <div class="modal-backdrop" (click)="deleteTarget.set(null)">
        <div class="modal-card" style="max-width:400px" (click)="$event.stopPropagation()">
          <div class="modal-title">Delete {{ deleteTarget()!.kind === 'asset' ? 'Asset' : 'Category' }} <button class="modal-close" (click)="deleteTarget.set(null)">✕</button></div>
          <div class="del-confirm">Are you sure you want to delete <strong>{{ deleteTarget()!.label }}</strong>? This cannot be undone.</div>
          @if (modalError()) { <div class="error-msg">{{ modalError() }}</div> }
          <div class="modal-actions">
            <button class="btn-cancel" (click)="deleteTarget.set(null)">Cancel</button>
            <button class="btn-danger" [disabled]="saving()" (click)="confirmDelete()">{{ saving() ? 'Deleting…' : 'Delete' }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Sidebar -->
    <nav class="sidebar">
      <div class="flex items-center gap-3 px-4 py-5 border-b border-gray-100 mb-2" style="min-height:64px">
        <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span class="text-white text-sm font-bold">D</span>
        </div>
        <span class="text-base font-bold text-gray-900 whitespace-nowrap">DITO Admin</span>
      </div>
      <div class="flex-1 py-2 overflow-hidden">
        <button class="nav-item" (click)="router.navigate(['/dashboard'])">
          <span class="icon">🏠</span><span>Dashboard</span>
        </button>
        <div class="h-px bg-gray-100 mx-4 my-2"></div>
        <button class="nav-item active">
          <span class="icon">📦</span><span>Asset Management</span>
        </button>
      </div>
      <div class="border-t border-gray-100 py-3">
        <div class="flex items-center gap-3 px-4 py-2 whitespace-nowrap overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span class="text-red-600 text-xs font-bold">A</span>
          </div>
          <span class="text-sm text-gray-700 truncate font-medium">{{ auth.user()?.name }}</span>
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
          Assets <span style="margin-left:5px;background:#EFF6FF;color:#2563EB;padding:1px 7px;border-radius:20px;font-size:11px;font-weight:700">{{ totalCount() }}</span>
        </button>
        <button class="tab" [class.active]="activeTab()==='categories'" (click)="activeTab.set('categories')">
          Categories <span style="margin-left:5px;background:#F3F4F6;color:#6B7280;padding:1px 7px;border-radius:20px;font-size:11px;font-weight:700">{{ categories().length }}</span>
        </button>
      </div>

      <!-- ── Categories tab ── -->
      @if (activeTab() === 'categories') {
        <div class="cat-grid">
          @for (cat of categories(); track cat.id) {
            <div class="cat-card">
              <div class="cat-dot" [style.background]="cat.color + '22'">{{ cat.icon }}</div>
              <div>
                <div class="cat-name">{{ cat.name }}</div>
                <div style="font-size:11px;color:#9CA3AF">{{ assetCountFor(cat.name) }} assets</div>
              </div>
              <div class="cat-actions">
                <button class="action-btn edit-btn" (click)="openEditCategory(cat)">Edit</button>
                <button class="action-btn del-btn" (click)="deleteTarget.set({kind:'category',id:cat.id,label:cat.name})">Del</button>
              </div>
            </div>
          }
          @if (categories().length === 0 && !loadingCats()) {
            <div class="empty-state" style="grid-column:1/-1">No categories yet — add one above.</div>
          }
        </div>
      }

      <!-- ── Assets tab ── -->
      @if (activeTab() === 'assets') {
        <div class="toolbar">
          <input class="search-input" type="text" placeholder="Search assets…"
            [(ngModel)]="searchQuery" (ngModelChange)="onSearch()" />
          <select class="filter-select" [(ngModel)]="filterCategory" (ngModelChange)="onFilter()">
            <option value="">All Categories</option>
            @for (c of categories(); track c.id) {
              <option [value]="c.name">{{ c.icon }} {{ c.name }}</option>
            }
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Category</th>
              <th>Type</th>
              <th>Dimensions</th>
              <th>Tags</th>
              <th>Vis.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr class="loading-row"><td colspan="7" style="padding:40px">Loading assets…</td></tr>
            } @else if (assets().length === 0) {
              <tr><td colspan="7"><div class="empty-state"><div style="font-size:36px;margin-bottom:10px">📦</div><div style="font-weight:600">No assets found</div></div></td></tr>
            } @else {
              @for (a of assets(); track a.id) {
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="thumb">
                        @if (a.thumbnailUrl) { <img [src]="a.thumbnailUrl" [alt]="a.name" /> }
                        @else { {{ categoryIcon(a.category) }} }
                      </div>
                      <div>
                        <div style="font-weight:600;color:#111827">{{ a.name }}</div>
                        @if (a.glbUrl) {
                          <div style="font-size:10px;color:#9CA3AF;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ a.glbUrl }}</div>
                        } @else {
                          <div style="font-size:10px;color:#10B981">▲ Procedural mesh</div>
                        }
                      </div>
                    </div>
                  </td>
                  <td>
                    @let catObj = categoryObj(a.category);
                    @if (catObj) {
                      <span class="badge" [style.background]="catObj.color + '22'" [style.color]="catObj.color">{{ catObj.icon }} {{ a.category }}</span>
                    } @else {
                      <span class="badge badge-gray">{{ a.category }}</span>
                    }
                  </td>
                  <td><span class="badge badge-blue">{{ a.metadata?.['type'] ?? '—' }}</span></td>
                  <td style="font-size:11px;color:#6B7280">
                    @let dim = a.metadata?.['dimensions'];
                    @if (dim) { {{ dim['width'] }}×{{ dim['depth'] }}×{{ dim['height'] }}m }
                    @else { — }
                  </td>
                  <td>
                    <div style="display:flex;flex-wrap:wrap;gap:3px">
                      @for (t of a.tags.slice(0,2); track t) { <span class="badge badge-gray">{{ t }}</span> }
                      @if (a.tags.length > 2) { <span class="badge badge-gray">+{{ a.tags.length-2 }}</span> }
                    </div>
                  </td>
                  <td><span class="badge" [class.badge-green]="a.isPublic" [class.badge-gray]="!a.isPublic">{{ a.isPublic ? '✓' : '✕' }}</span></td>
                  <td>
                    <button class="action-btn edit-btn" (click)="openEditAsset(a)">Edit</button>
                    <button class="action-btn del-btn" (click)="deleteTarget.set({kind:'asset',id:a.id,label:a.name})">Del</button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        @if (totalCount() > pageSize) {
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;font-size:13px">
            <span style="color:#6B7280">Showing {{ (page()-1)*pageSize+1 }}–{{ Math.min(page()*pageSize, totalCount()) }} of {{ totalCount() }}</span>
            <div style="display:flex;gap:8px">
              <button class="action-btn edit-btn" [disabled]="page()===1" (click)="goPage(-1)">← Prev</button>
              <span style="padding:4px 10px">{{ page() }}</span>
              <button class="action-btn edit-btn" [disabled]="page()*pageSize>=totalCount()" (click)="goPage(1)">Next →</button>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class AdminAssetsComponent implements OnInit {
  readonly auth      = inject(AuthService);
  readonly assetSvc  = inject(AssetService);
  readonly router    = inject(Router);
  readonly Math      = Math;
  readonly pageSize  = 20;

  activeTab   = signal<'assets' | 'categories'>('assets');
  assets      = signal<Asset[]>([]);
  categories  = signal<Category[]>([]);
  totalCount  = signal(0);
  loading     = signal(true);
  loadingCats = signal(true);
  page        = signal(1);
  searchQuery    = '';
  filterCategory = '';

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

  ngOnInit() { this.loadCategories(); this.loadAssets(); }

  private loadCategories() {
    this.loadingCats.set(true);
    this.assetSvc.listCategories().subscribe({
      next: cats => { this.categories.set(cats); this.loadingCats.set(false); },
      error: () => this.loadingCats.set(false),
    });
  }

  private loadAssets() {
    this.loading.set(true);
    const p: Record<string, string | number> = { page: this.page(), limit: this.pageSize };
    if (this.searchQuery.trim()) p['search'] = this.searchQuery.trim();
    if (this.filterCategory) p['category'] = this.filterCategory;
    this.assetSvc.list(p as any).subscribe({
      next: r => { this.assets.set(r.data ?? []); this.totalCount.set(r.meta?.total ?? 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onSearch() { this.page.set(1); this.loadAssets(); }
  onFilter() { this.page.set(1); this.loadAssets(); }
  goPage(dir: 1 | -1) { this.page.update(p => p + dir); this.loadAssets(); }

  categoryIcon(name: string) { return this.categories().find(c => c.name === name)?.icon ?? '📦'; }
  categoryObj(name: string)  { return this.categories().find(c => c.name === name) ?? null; }
  assetCountFor(catName: string) { return this.assets().filter(a => a.category === catName).length; }

  validateMetaJson() {
    try { JSON.parse(this.assetForm.metadataRaw); this.metaJsonError.set(''); }
    catch { this.metaJsonError.set('Invalid JSON — check syntax.'); }
  }

  // ── Asset modal ─────────────────────────────────────────────────────────────
  openAddAsset() {
    this.editAssetId.set(null);
    this.assetForm = emptyAssetForm(this.filterCategory || (this.categories()[0]?.name ?? ''));
    this.modalError.set(''); this.metaJsonError.set('');
    this.showAssetModal.set(true);
  }

  openEditAsset(a: Asset) {
    this.editAssetId.set(a.id);
    this.assetForm = {
      name: a.name, category: a.category, glbUrl: a.glbUrl ?? '',
      thumbnailUrl: a.thumbnailUrl ?? '', tags: a.tags.join(', '),
      isPublic: a.isPublic,
      metadataRaw: JSON.stringify(a.metadata ?? {}, null, 2),
    };
    this.modalError.set(''); this.metaJsonError.set('');
    this.showAssetModal.set(true);
  }

  saveAsset() {
    const { name, category, glbUrl, thumbnailUrl, tags, isPublic, metadataRaw } = this.assetForm;
    if (!name.trim()) { this.modalError.set('Name is required.'); return; }
    if (!category)    { this.modalError.set('Category is required.'); return; }
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(metadataRaw || '{}'); }
    catch { this.modalError.set('Fix the JSON metadata before saving.'); return; }

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
      next: () => { this.saving.set(false); this.closeModals(); this.loadAssets(); },
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
        if (t.kind === 'asset') this.loadAssets(); else { this.loadCategories(); this.loadAssets(); }
      },
      error: (e: any) => { this.saving.set(false); this.modalError.set(e?.error?.message ?? 'Delete failed.'); },
    });
  }
}
