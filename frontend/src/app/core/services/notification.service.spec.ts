import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('agrega un toast de error con un id único', () => {
    service.error('Correo inválido');
    service.error('Otro error');

    const toasts = service.toasts();
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toMatchObject({ type: 'error', message: 'Correo inválido' });
    expect(toasts[1].id).not.toBe(toasts[0].id);
  });

  it('agrega toasts de éxito e información con su propio tipo', () => {
    service.success('Guardado');
    service.info('Aviso');

    const toasts = service.toasts();
    expect(toasts.map((toast) => toast.type)).toEqual(['success', 'info']);
  });

  it('dismiss quita un toast específico sin afectar los demás', () => {
    service.error('Primero');
    service.error('Segundo');
    const [first, second] = service.toasts();

    service.dismiss(first.id);

    expect(service.toasts()).toEqual([second]);
  });

  it('los toasts de error se auto-descartan después de su tiempo', () => {
    vi.useFakeTimers();
    service.error('Se va a ir solo');
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(8000);

    expect(service.toasts()).toHaveLength(0);
  });
});
