import { Response, ResponseOptions } from '@angular/http';
import { AuthConfig } from 'angular2-jwt';
import 'core-js';
import { JwtConfigService } from './angular2-jwt-refresh';


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
      tokenSetter: (res: Response) => true,
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
