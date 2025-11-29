import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    getCurrentUser(): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
        });
        
        return this.http.get(`${this.apiUrl}check_login_status`, { 
            headers: headers, 
            withCredentials: true 
        });
    }

    private apiUrl = environment.apiUrl;

    private token: string = '';
    private userId: number | undefined;

    constructor(
        private http: HttpClient,
        @Inject(PLATFORM_ID) private platformId: Object,
        private router: Router
    ) {
        if (isPlatformBrowser(this.platformId)) {
            this.token = localStorage.getItem('token') || '';
            this.userId = parseInt(localStorage.getItem('userId') || '', 10);
            console.log('Constructor - Token:', this.token, 'UserId:', this.userId);
        }
    }

    getUserId(): number {
        if (!this.userId) {
            throw new Error('User ID is not set');
        }
        return this.userId;
    }

    setUserId(userId: number): void {
        this.userId = userId;
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('userId', userId.toString());
            console.log('setUserId - UserId set:', this.userId);
        }
    }

    login(email: string, password: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        const data = { email, password };

        return this.http.post(`${this.apiUrl}login`, data, { headers: headers, withCredentials: true });
    }

    register(name: string, email: string, cellphone: string, password: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json'
        });

        const data = { name, email, cellphone, password };

        return this.http.post(`${this.apiUrl}register`, data, { headers: headers, withCredentials: true });
    }

    logout(): Observable<any> {
        return this.http.post(`${this.apiUrl}logout`, {}, { withCredentials: true }).pipe(
            tap(() => {
                if (isPlatformBrowser(this.platformId)) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('userId');
                }
                this.token = '';
                this.userId = undefined;
                console.log('logout - Token and UserId removed');
            })
        );
    }

    isLoggedIn(): boolean {
        const loggedIn = !!this.token && !!this.userId;
        console.log('isLoggedIn:', loggedIn);
        return loggedIn;
    }

    // getToken(): string {
    //     console.log('getToken:', this.token);
    //     return this.token;
    // }

    getToken(): string {
    if (isPlatformBrowser(this.platformId)) {
        // Always get the latest token from localStorage
        this.token = localStorage.getItem('token') || '';
    }
    console.log('getToken:', this.token);
    return this.token;
}

    setToken(token: string): void {
        this.token = token;
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('token', token);
            console.log('setToken - Token set:', this.token);
        }
    }
}
