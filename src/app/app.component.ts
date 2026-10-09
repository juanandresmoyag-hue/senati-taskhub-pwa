import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StorageService } from './services/storage.service';
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
  tareaSeleccionadaId: number | null = null;
  comentarioEntrega = '';
  notificacionMensaje = '';

  constructor() {
    window.addEventListener('online', () => (this.online = true));
    window.addEventListener('offline', () => (this.online = false));
  }

  ngOnInit(): void {
    this.cargarTareas();
  }

  get tareaSeleccionada(): Tarea | undefined {
    return this.listaTareas.find((tarea) => tarea.id === this.tareaSeleccionadaId);
  }

  cargarTareas(): void {
    this.tareaService.obtenerTareas().subscribe({
      next: (data) => {
        this.listaTareas = data;
        if (data.length > 0 && this.tareaSeleccionadaId === null) {
          this.tareaSeleccionadaId = data[0].id;
        }
      },
      error: (error) => {
        console.error('Error al recuperar tareas:', error);
        this.notificacionMensaje = 'No se pudo cargar el catálogo de tareas.';
      }
    });
  }

  async enviarEntrega(): Promise<void> {
    if (!this.comentarioEntrega.trim()) {
      this.notificacionMensaje = 'Escribe un comentario antes de enviar la entrega.';
      return;
    }

    const entregaData = {
      tareaId: this.tareaSeleccionadaId,
      comentario: this.comentarioEntrega,
      usuario: 'Estudiante SENATI'
    };

    if (this.online) {
      this.notificacionMensaje = '🟢 Entrega enviada exitosamente al servidor del Campus Virtual.';
    } else {
      await this.storageService.guardarEntregaLocal(entregaData);
      this.notificacionMensaje = '🔴 Sin conexión: entrega guardada en el dispositivo. Estado: PENDIENTE';
    }

    this.comentarioEntrega = '';
  }
}

