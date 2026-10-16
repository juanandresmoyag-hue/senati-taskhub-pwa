import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EntregaLocal, StorageService } from './services/storage.service';
import { Tarea, TareaService } from './services/tarea.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  online = navigator.onLine;

  private readonly tareaService = inject(TareaService);
  private readonly storageService = inject(StorageService);

  listaTareas: Tarea[] = [];
  entregasLocales: EntregaLocal[] = [];
  tareaSeleccionadaId: number | null = null;
  comentarioEntrega = '';
  busquedaTitulo = '';
  cursoSeleccionado = '';
  notificacionMensaje = '';
  errorFormulario = '';
  detalleEntregaId: number | null = null;

  ngOnInit(): void {
    this.cargarTareas();
    void this.cargarEntregas();
  }

  @HostListener('window:online')
  alRecuperarConexion(): void {
    this.online = true;
    this.notificacionMensaje = 'Conexión recuperada. Tus entregas siguen pendientes hasta que una API confirme su sincronización.';
  }

  @HostListener('window:offline')
  alPerderConexion(): void {
    this.online = false;
    this.notificacionMensaje = 'Estás sin conexión. Puedes seguir guardando entregas en este dispositivo.';
  }

  get tareaSeleccionada(): Tarea | undefined {
    return this.listaTareas.find((tarea) => tarea.id === this.tareaSeleccionadaId);
  }

  get cursosDisponibles(): string[] {
    return [...new Set(this.listaTareas.map((tarea) => tarea.curso))].sort();
  }

  get tareasFiltradas(): Tarea[] {
    const titulo = this.busquedaTitulo.trim().toLocaleLowerCase();

    return this.listaTareas.filter((tarea) => {
      const coincideTitulo = tarea.titulo.toLocaleLowerCase().includes(titulo);
      const coincideCurso = !this.cursoSeleccionado || tarea.curso === this.cursoSeleccionado;
      return coincideTitulo && coincideCurso;
    });
  }

  get cantidadPendiente(): number {
    // El contador se calcula desde los registros persistidos, no desde el estado de conexión.
    return this.entregasLocales.filter((entrega) => entrega.estadoSincronizacion === 'PENDIENTE').length;
  }

  cargarTareas(): void {
    this.tareaService.obtenerTareas().subscribe({
      next: (data) => {
        this.listaTareas = data;
        if (data.length > 0 && this.tareaSeleccionadaId === null) {
          this.tareaSeleccionadaId = data[0].id;
        }
      },
      error: (error: unknown) => {
        console.error('Error al recuperar tareas:', error);
        this.notificacionMensaje = 'No se pudo cargar el catálogo de tareas.';
      }
    });
  }

  async cargarEntregas(): Promise<void> {
    try {
      this.entregasLocales = await this.storageService.obtenerEntregas();
    } catch (error) {
      console.error('Error al recuperar entregas locales:', error);
      this.notificacionMensaje = 'No se pudieron recuperar tus entregas locales. Revisa el almacenamiento del navegador.';
    }
  }

  async enviarEntrega(): Promise<void> {
    this.errorFormulario = '';

    if (this.tareaSeleccionadaId === null || !this.tareaSeleccionada) {
      this.errorFormulario = 'Selecciona una tarea antes de guardar tu entrega.';
      return;
    }

    const comentario = this.comentarioEntrega.trim();
    if (!comentario) {
      this.errorFormulario = 'Escribe un comentario para describir tu entrega.';
      return;
    }

    try {
      const entrega = await this.storageService.guardarEntregaLocal({
        identificadorLocal: globalThis.crypto.randomUUID(),
        tareaId: this.tareaSeleccionada.id,
        comentario,
        fechaRegistro: new Date().toISOString(),
        // La aplicación no tiene API de entregas: estar online no confirma una sincronización.
        estadoSincronizacion: 'PENDIENTE'
      });
      this.entregasLocales = [entrega, ...this.entregasLocales];
      this.comentarioEntrega = '';
      this.notificacionMensaje = this.online
        ? 'Entrega guardada en este dispositivo como PENDIENTE. No hay una API conectada para sincronizarla.'
        : 'Sin conexión: entrega guardada en este dispositivo como PENDIENTE.';
    } catch (error) {
      console.error('Error al guardar la entrega local:', error);
      this.notificacionMensaje = 'No se pudo guardar la entrega. Verifica que el almacenamiento local esté disponible e inténtalo de nuevo.';
    }
  }

  tareaDeEntrega(tareaId: number): Tarea | undefined {
    return this.listaTareas.find((tarea) => tarea.id === tareaId);
  }

  verDetalle(entregaId: number): void {
    this.detalleEntregaId = this.detalleEntregaId === entregaId ? null : entregaId;
  }

  async eliminarEntrega(entrega: EntregaLocal): Promise<void> {
    const tarea = this.tareaDeEntrega(entrega.tareaId);
    const tituloTarea = tarea?.titulo ?? 'esta tarea';
    if (!window.confirm(`¿Eliminar la entrega de "${tituloTarea}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await this.storageService.eliminarEntrega(entrega.id);
      this.entregasLocales = this.entregasLocales.filter((item) => item.id !== entrega.id);
      if (this.detalleEntregaId === entrega.id) {
        this.detalleEntregaId = null;
      }
      this.notificacionMensaje = 'La entrega local se eliminó correctamente.';
    } catch (error) {
      console.error('Error al eliminar la entrega local:', error);
      this.notificacionMensaje = 'No se pudo eliminar la entrega local. Inténtalo de nuevo.';
    }
  }

  reintentarPendientes(): void {
    if (!this.online) {
      this.notificacionMensaje = 'Necesitas conexión para reintentar el envío. Las entregas continúan como PENDIENTE.';
      return;
    }

    if (this.cantidadPendiente === 0) {
      this.notificacionMensaje = 'No hay entregas pendientes por reintentar.';
      return;
    }

    // El reintento es explícito, pero sin API no se modifica el estado local a SINCRONIZADO.
    this.notificacionMensaje = `Reintento no disponible: aún no hay una API conectada. ${this.cantidadPendiente} entrega(s) continúan como PENDIENTE.`;
  }
}
