/**
 * Estado exclusivo de las vitrinas, independiente de Three.js.
 * Ningún logo se solicita hasta ejecutar toggle() desde una interacción válida.
 * Un token invalida las respuestas tardías al cerrar, viajar o elegir otra mascota.
 */
export class RevealState {
  constructor({ load, onChange = () => {}, onError = () => {} }) {
    this.load = load;
    this.onChange = onChange;
    this.onError = onError;
    this.activeId = null;
    this.status = 'closed';
    this.serial = 0;
    this.discovered = new Set();
  }
  close() {
    this.serial += 1;
    this.activeId = null;
    this.status = 'closed';
    this.onChange({ status: 'closed', id: null });
  }
  async toggle(id) {
    if (!id) return;
    if (this.activeId === id) { this.close(); return; }
    const token = ++this.serial;
    this.activeId = id;
    this.status = 'loading';
    this.onChange({ status: 'loading', id });
    try {
      const asset = await this.load(id);
      if (token !== this.serial) return;
      this.status = 'open';
      this.discovered.add(id);
      this.onChange({ status: 'open', id, asset });
    } catch (error) {
      if (token !== this.serial) return;
      this.close();
      this.onError(error, id);
    }
  }
}
