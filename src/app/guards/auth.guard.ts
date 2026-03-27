// auth.guard.ts
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        if (state.url.startsWith('/admin')) {
            const adminToken = sessionStorage.getItem('admin_auth_token');
            const adminUserId = sessionStorage.getItem('admin_user_id');

            if (adminToken && adminUserId) {
                return true;
            }

            this.router.navigate(['/admin-login']);
            return false;
        }

        if (this.authService.isLoggedIn()) {
            return true;
        } else {
            this.router.navigate(['/login']);
            return false;
        }
    }
}