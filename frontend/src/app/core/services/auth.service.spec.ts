import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

describe('AuthService — refresh concurrente', () => {
  let service: AuthService;
  let postMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.setItem('atlas.accessToken', 'old-access');
    localStorage.setItem('atlas.refreshToken', 'old-refresh');

    postMock = vi
      .fn()
      .mockReturnValue(of({ accessToken: 'new-access', refreshToken: 'new-refresh' }));

    TestBed.configureTestingModule({
      providers: [{ provide: HttpClient, useValue: { post: postMock, get: vi.fn() } }],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('dos refresh() lanzados a la vez comparten una sola llamada HTTP', async () => {
    // Simula el caso real: dos peticiones en paralelo reciben un 401 casi al
    // mismo tiempo (access token expirado) y ambas llaman a refresh().
    const [first, second] = await Promise.all([service.refresh(), service.refresh()]);

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
  });

  it('un refresh() posterior, ya resuelto el anterior, dispara una llamada nueva', async () => {
    await service.refresh();
    await service.refresh();

    expect(postMock).toHaveBeenCalledTimes(2);
  });
});
