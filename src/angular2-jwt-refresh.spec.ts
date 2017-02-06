import { Response, ResponseOptions } from '@angular/http';
import { AuthConfig, AuthHttp } from 'angular2-jwt';
import { encodeTestToken } from 'angular2-jwt/angular2-jwt-test-helpers';
import 'core-js';
import { Observable } from 'rxjs';
import { JwtConfigService, JwtHttp } from './angular2-jwt-refresh';


const expiredToken = encodeTestToken({
  'exp': 0
});
const validToken = encodeTestToken({
  'exp': 8888888888
});
const newValidToken = encodeTestToken({
  'exp': 9999999999
});
// const noExpiryToken = encodeTestToken({
//   'sub': '1234567890',
//   'name': 'John Doe',
//   'admin': true
// });

describe('JwtConfigService', () => {
  'use strict';

  it('should have default values', () => {
    const configExpected = { endPoint: 'endPoint' };
    const jwtConfigService = new JwtConfigService(configExpected, new AuthConfig());
    expect(jwtConfigService.getRefreshConfig).toBeDefined();
    expect(jwtConfigService.getAuthOptions).toBeDefined();
    expect(jwtConfigService.getAuthConfig).toBeDefined();
    expect(jwtConfigService.getAuthOptions() instanceof AuthConfig).toBeTruthy();

    const config = jwtConfigService.getRefreshConfig();
    expect(config).toBeDefined();
    expect(config.endPoint).toBe(configExpected.endPoint);
    expect(config.payload).toEqual({ });
    expect(config.beforeSeconds).toBe(600);
    expect(config.tokenName).toBe('refresh_token');
    expect(config.refreshTokenGetter).toBeDefined();
    expect(config.tokenSetter).toBeDefined();
    const body = {
      id_token: 'id_token',
      refresh_token: 'refresh_token'
    };
    let responseOptions = new ResponseOptions({ body: JSON.stringify(body) });

    // has token
    let response = new Response(responseOptions);

    expect(config.tokenSetter(response)).toBeTruthy();
    expect(config.refreshTokenGetter()).toBe(body.refresh_token);

    // has no token
    responseOptions.body = JSON.stringify({});
    response = new Response(responseOptions);

    expect(config.tokenSetter(response)).toBeFalsy();
    expect(config.refreshTokenGetter()).toBeNull();
  });

  it('should have custom values', () => {
    const configExpected = {
      endPoint: 'endPoint',
      payload: { type: 'refresh' },
      beforeSeconds: 0,
      tokenName: 'refresh',
      refreshTokenGetter: () => 'this is a token',
      tokenSetter: (res: Response) => !!res,
    };
    const config = new JwtConfigService(configExpected, new AuthConfig()).getRefreshConfig();
    expect(config).toBeDefined();
    expect(config.endPoint).toBe(configExpected.endPoint);
    expect(config.payload).toEqual(configExpected.payload);
    expect(config.beforeSeconds).toBe(configExpected.beforeSeconds);
    expect(config.tokenName).toBe(configExpected.tokenName);
    expect(config.refreshTokenGetter).toBeDefined();
    expect(config.refreshTokenGetter()).toBe('this is a token');
    expect(config.tokenSetter).toBeDefined();
    expect(config.tokenSetter(new Response(new ResponseOptions()))).toBe(true);
  });

  it('should use custom token name in default refreshTokenGetter', () => {
    const configExpected = {
      endPoint: 'endPoint',
      tokenName: 'refresh'
    };
    const token = 'token';
    const config = new JwtConfigService(configExpected, new AuthConfig()).getRefreshConfig();
    localStorage.setItem(configExpected.tokenName, token);

    expect(config).toBeDefined();
    expect(config.tokenName).toBe(configExpected.tokenName);
    expect(config.refreshTokenGetter()).toBe(token);
  });
});

describe('JwtHttp', () => {
  describe('request', () => {
    it('handles tokenGetter returning string', () => {
      const config = { endPoint: 'endPoint' };
      const jwtConfigService = new JwtConfigService(config, new AuthConfig({ tokenGetter: () => validToken }));

      let jwtHttp: JwtHttp = new JwtHttp(jwtConfigService, null);

      spyOn(jwtHttp, 'refreshTheToken').and.callThrough();

      jwtHttp.request(null);

      expect(jwtHttp['refreshTheToken']).toHaveBeenCalledWith(validToken);
    });

    it('handles tokenGetter returning Promise\<string\>', (done: Function) => {
      const config = { endPoint: 'endPoint' };
      const jwtConfigService = new JwtConfigService(config, new AuthConfig({ tokenGetter: () => Promise.resolve(validToken) }));

      let jwtHttp: JwtHttp = new JwtHttp(jwtConfigService, null);

      spyOn(AuthHttp.prototype, 'request' ).and.returnValue(Observable.of(''));
      spyOn(jwtHttp, 'refreshTheToken').and.callThrough();

      jwtHttp.request(null, null).subscribe(() => {
        expect(AuthHttp.prototype.request).toHaveBeenCalledWith(null, null);
        expect(jwtHttp['refreshTheToken']).toHaveBeenCalledWith(validToken);
        done();
      });
    });

    it('handles refreshTokenGetter returning string', () => {
      const config = { endPoint: 'endPoint', refreshTokenGetter: () => validToken };
      const jwtConfigService = new JwtConfigService(config, new AuthConfig({ tokenGetter: () => expiredToken }));

      let jwtHttp: JwtHttp = new JwtHttp(jwtConfigService, null);

      spyOn(jwtHttp, 'refreshTheToken').and.callThrough();
      spyOn(jwtHttp, '_refreshTheToken').and.returnValue(Observable.of(''));

      jwtHttp.request(null);

      expect(jwtHttp['refreshTheToken']).toHaveBeenCalledWith(expiredToken);
      expect(jwtHttp['_refreshTheToken']).toHaveBeenCalledWith();
    });

    it('handles refreshTokenGetter returning Promise\<string\>', (done: Function) => {
      const config = { endPoint: 'endPoint', refreshTokenGetter: () => validToken };
      const jwtConfigService = new JwtConfigService(config, new AuthConfig({ tokenGetter: () => expiredToken }));

      let jwtHttp: JwtHttp = new JwtHttp(jwtConfigService, null);

      spyOn(AuthHttp.prototype, 'request' ).and.returnValue(Observable.of(''));
      spyOn(jwtHttp, 'refreshTheToken').and.callThrough();
      spyOn(jwtHttp, '_refreshTheToken').and.returnValue(Observable.of(''));

      jwtHttp.request(null, null).subscribe(() => {
        expect(AuthHttp.prototype.request).toHaveBeenCalledWith(null, null);
        expect(jwtHttp['refreshTheToken']).toHaveBeenCalledWith(expiredToken);
        expect(jwtHttp['_refreshTheToken']).toHaveBeenCalledWith();
        done();
      });
    });

    it('should refresh token', (done: Function) => {
      const config = { endPoint: 'endPoint' };
      const jwtConfigService = new JwtConfigService(config, new AuthConfig());
      const body = {
        id_token: validToken,
        refresh_token: newValidToken
      };
      const responseOptions = new ResponseOptions({ body: JSON.stringify(body) });
      const response = new Response(responseOptions);
      localStorage.setItem(jwtConfigService.getAuthConfig().tokenName, expiredToken);

      let jwtHttp: JwtHttp = new JwtHttp(jwtConfigService, null);

      spyOn(AuthHttp.prototype, 'request' ).and.returnValue(Observable.of(''));
      spyOn(jwtHttp, 'refreshTheToken').and.callThrough();
      spyOn(jwtHttp, '_refreshTheToken').and.callThrough();
      spyOn(jwtHttp, 'httpRequest').and.returnValue(Observable.of(response));

      jwtHttp.request(null, null).subscribe(() => {
        expect(AuthHttp.prototype.request).toHaveBeenCalledWith(null, null);
        expect(jwtHttp['refreshTheToken']).toHaveBeenCalledWith(expiredToken);
        expect(jwtHttp['_refreshTheToken']).toHaveBeenCalledWith();
        expect(jwtHttp['httpRequest']).toHaveBeenCalled();
        expect(jwtConfigService.getAuthConfig().tokenGetter()).toEqual(body.id_token);
        expect(jwtConfigService.getRefreshConfig().refreshTokenGetter()).toEqual(body.refresh_token);
        done();
      });
    });
  });
});
