import { Injectable, signal, computed } from '@angular/core';

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: Date;
  undone: boolean;
}

@Injectable()
export class HistoryService {
  private readonly _entries = signal<HistoryEntry[]>([]);
  readonly entries = this._entries.asReadonly();
  readonly canUndo = computed(() => this._entries().some(e => !e.undone));
  readonly canRedo = computed(() => this._entries().some(e => e.undone));

  push(label: string): void {
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      label,
      timestamp: new Date(),
      undone: false
    };
    this._entries.update(list => [...list.slice(-49), entry]);
  }

  undo(): void {
    const entries = this._entries();
    const lastActive = [...entries].reverse().find(e => !e.undone);
    if (lastActive) {
      this._entries.update(list => list.map(e => e.id === lastActive.id ? { ...e, undone: true } : e));
    }
  }

  redo(): void {
    const firstUndone = this._entries().find(e => e.undone);
    if (firstUndone) {
      this._entries.update(list => list.map(e => e.id === firstUndone.id ? { ...e, undone: false } : e));
    }
  }

  clear(): void { this._entries.set([]); }
}
