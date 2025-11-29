import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css']
})
export class LoginECommComponent {
  loginForm: FormGroup;
  showPassword = false; // Add password visibility toggle

  constructor(private fb: FormBuilder, private authService: AuthService, private router: Router, private http: HttpClient) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  // Add password toggle method
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Add navigation method to user login
  goToUserLogin() {
    this.router.navigate(['/login']);
  }

  login() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe(response => {
        console.log('Login response:', response); // Add debugging
        
        if (response && response.token && response.user_id) {
          // Store in AuthService
          this.authService.setToken(response.token);
          this.authService.setUserId(response.user_id);
          
          // Also store in localStorage for direct access
          localStorage.setItem('user_email', email);
          localStorage.setItem('auth_token', response.token); // Add this line
          localStorage.setItem('user_id', response.user_id.toString());
          
          Swal.fire({
            icon: 'success',
            title: 'Login Successful',
            showConfirmButton: false,
            timer: 1500
          });
          setTimeout(() => this.router.navigate(['/admin']), 1500);
        } else {
          console.error('Login response missing token or user_id:', response);
          Swal.fire({
            icon: 'error',
            title: 'Login Failed',
            text: 'Invalid credentials. Please try again.',
            timer: 2000
          });
        }
      }, error => {
        console.error('Login error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: 'Server error. Please try again later.',
          timer: 2000
        });
      });
    }
  }
}
