import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { forkJoin, of, Subscription, interval } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface Message {
  sender: string;
  recipient: string;
  content: string;
  timestamp?: string | Date;
  clientId?: string;
}

interface User {
  id?: number;
  name: string;
  email: string;
  role?: string;
}

@Component({
  selector: 'app-message',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit, OnDestroy {
  userName = 'User';
  users: User[] = [];
  messageForm: FormGroup;
  messages: Message[] = [];
  selectedRecipient: User | null = null;
  searchTerm: string = '';
  unreadCounts: { [email: string]: number } = {};
  private lastReadByUser: { [email: string]: number } = {};

  // Add these properties to your component class
  sidebarOpen = false;
  isMobile = false;

  private socket: Socket;
  private pollingSubscription?: Subscription;
  private resizeHandler = () => {
    this.isMobile = window.innerWidth <= 700;
    if (!this.isMobile) this.sidebarOpen = false;
  };

  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient, private ngZone: NgZone) {
    this.userName = this.resolveCurrentUserEmail() || 'User';

    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(250)]]
    });
    this.socket = io(environment.socketUrl);
  }

  private isAdminContext(): boolean {
    return this.router.url.startsWith('/admin') || window.location.pathname.startsWith('/admin');
  }

  private resolveCurrentUserEmail(): string | null {
    if (this.isAdminContext()) {
      return sessionStorage.getItem('admin_user_email') || localStorage.getItem('user_email');
    }

    return localStorage.getItem('user_email');
  }

  private getReadStateStorageKey(): string {
    const context = this.isAdminContext() ? 'admin' : 'user';
    return `message_last_read_${context}_${this.userName}`;
  }

  private loadReadState(): void {
    try {
      const raw = sessionStorage.getItem(this.getReadStateStorageKey());
      this.lastReadByUser = raw ? JSON.parse(raw) : {};
    } catch {
      this.lastReadByUser = {};
    }
  }

  private saveReadState(): void {
    sessionStorage.setItem(this.getReadStateStorageKey(), JSON.stringify(this.lastReadByUser));
  }

  private getMessageTimeMs(message: Message): number {
    if (!message.timestamp) {
      return 0;
    }

    const timeMs = new Date(message.timestamp).getTime();
    return Number.isFinite(timeMs) ? timeMs : 0;
  }

  private isSameMessage(a: Message, b: Message): boolean {
    if (a.clientId && b.clientId) {
      return a.clientId === b.clientId;
    }

    return a.sender === b.sender &&
      a.recipient === b.recipient &&
      a.content === b.content &&
      this.getMessageTimeMs(a) === this.getMessageTimeMs(b);
  }

  private addMessageIfMissing(message: Message): void {
    const exists = this.messages.some((existing) => this.isSameMessage(existing, message));
    if (!exists) {
      this.messages = [...this.messages, message];
    }
  }

  private refreshUnreadCounts(): void {
    const nextUnread: { [email: string]: number } = {};

    this.messages.forEach((message) => {
      if (message.recipient !== this.userName || message.sender === this.userName) {
        return;
      }

      const sender = message.sender;
      const messageTime = this.getMessageTimeMs(message);
      const lastRead = this.lastReadByUser[sender] || 0;
      const isCurrentOpenConversation = this.selectedRecipient?.email === sender;

      if (!isCurrentOpenConversation && messageTime > lastRead) {
        nextUnread[sender] = (nextUnread[sender] || 0) + 1;
      }
    });

    this.unreadCounts = nextUnread;
  }

  private markConversationAsRead(userEmail: string): void {
    this.lastReadByUser[userEmail] = Date.now();
    this.saveReadState();
    this.refreshUnreadCounts();
  }

  private ensureUserExists(email: string): void {
    if (!email || email === this.userName) {
      return;
    }

    const exists = this.users.some((user) => user.email === email);
    if (!exists) {
      const fallbackName = email.split('@')[0] || 'User';
      this.users = [...this.users, { email, name: fallbackName }];
    }
  }

  getUnreadCount(userEmail: string): number {
    return this.unreadCounts[userEmail] || 0;
  }

  getTotalUnreadCount(): number {
    return Object.values(this.unreadCounts).reduce((sum, count) => sum + count, 0);
  }

  ngOnInit() {
    if (!this.userName || this.userName === 'User') {
      this.router.navigate([this.isAdminContext() ? '/admin-login' : '/login']);
      return;
    }

    this.loadReadState();

     this.http.get<User[]>(`${environment.apiUrl}all-users?currentUser=${this.userName}`)
  .subscribe(users => {
    this.users = users;
    this.syncConversationsFromApi();
  });

    this.socket.on('all-messages', (msgs: Message[]) => {
      this.ngZone.run(() => {
        this.messages = msgs;
        msgs.forEach((msg) => {
          if (msg.sender === this.userName) {
            this.ensureUserExists(msg.recipient);
          }
          if (msg.recipient === this.userName) {
            this.ensureUserExists(msg.sender);
          }
        });
        this.refreshUnreadCounts();
      });
    });
    this.socket.on('receive-message', (msg: Message) => {
      this.ngZone.run(() => {
        this.addMessageIfMissing(msg);

        if (msg.sender === this.userName) {
          this.ensureUserExists(msg.recipient);
        }
        if (msg.recipient === this.userName) {
          this.ensureUserExists(msg.sender);
        }

        // Unread indicator: incoming message from another user to me while that chat is not open.
        if (msg.recipient === this.userName && msg.sender !== this.userName) {
          const isOpenConversation = this.selectedRecipient?.email === msg.sender;
          if (isOpenConversation) {
            this.markConversationAsRead(msg.sender);
          } else {
            this.unreadCounts[msg.sender] = (this.unreadCounts[msg.sender] || 0) + 1;
          }
        }

        // Scroll to bottom if the message is for the currently selected conversation
        if (this.selectedRecipient && 
            ((msg.sender === this.selectedRecipient.email && msg.recipient === this.userName) ||
             (msg.sender === this.userName && msg.recipient === this.selectedRecipient.email))) {
          setTimeout(() => {
            this.scrollToBottom();
          }, 100);
        }
      });
    });

    this.isMobile = window.innerWidth <= 700;
    window.addEventListener('resize', this.resizeHandler);

    // Fallback sync so unread indicators still update even if socket events are missed.
    this.pollingSubscription = interval(5000).subscribe(() => {
      this.syncConversationsFromApi();
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
    this.pollingSubscription?.unsubscribe();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private syncConversationsFromApi(): void {
    const conversationUsers = this.users.filter((user) => user.email !== this.userName);
    if (conversationUsers.length === 0) {
      return;
    }

    const requests = conversationUsers.map((user) =>
      this.http.get<Message[]>(`${environment.apiUrl}messages?user1=${this.userName}&user2=${user.email}`).pipe(
        map((msgs) => ({ user, msgs })),
        catchError(() => of({ user, msgs: [] as Message[] }))
      )
    );

    forkJoin(requests).subscribe((results) => {
      this.ngZone.run(() => {
        let changed = false;

        results.forEach(({ user, msgs }) => {
          this.ensureUserExists(user.email);

          msgs.forEach((message) => {
            const beforeCount = this.messages.length;
            this.addMessageIfMissing(message);
            if (this.messages.length !== beforeCount) {
              changed = true;
            }
          });
        });

        if (changed) {
          this.refreshUnreadCounts();
        }
      });
    });
  }

  selectRecipient(user: User) {
  if (user.email !== this.userName) {
    this.selectedRecipient = user;
    this.markConversationAsRead(user.email);
    this.messageForm.reset();
    // Fetch messages from backend for this conversation
    this.http.get<Message[]>(
      `${environment.apiUrl}messages?user1=${this.userName}&user2=${user.email}`
    ).subscribe(msgs => {
      // Merge new messages, avoid duplicates
      const all = [...this.messages];
      msgs.forEach(m => {
        if (!all.find(existing => this.isSameMessage(existing, m))) {
          all.push(m);
        }
      });
      this.messages = all;
      this.refreshUnreadCounts();
      // Scroll to bottom to show most recent messages
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    });
    // Close sidebar on mobile
    if (this.isMobile) {
      this.sidebarOpen = false;
    }
  }
}
  sendMessage() {
  if (this.messageForm.valid && this.selectedRecipient) {
    // Create timestamp in GMT+8 timezone
    const nowGMT8 = new Date().toLocaleString("en-US", {timeZone: "Asia/Singapore"});
    const msg: Message = {
      clientId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sender: this.userName,
      recipient: this.selectedRecipient.email,
      content: this.messageForm.value.content,
      timestamp: new Date(nowGMT8) // Add current timestamp in GMT+8
    };
    // Optimistically render the message instantly without waiting for socket echo.
    this.addMessageIfMissing(msg);
    this.socket.emit('send-message', msg);
    // Save to backend
     this.http.post(`${environment.apiUrl}send-message`, msg)
      .subscribe();
    this.messageForm.reset();
    // Scroll to bottom to show new message
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  }
}

  filteredMessages() {
    if (!this.selectedRecipient) return [];
    const messages = this.messages.filter(
      m =>
        (m.sender === this.userName && m.recipient === this.selectedRecipient!.email) ||
        (m.sender === this.selectedRecipient!.email && m.recipient === this.userName)
    );
    
    // Sort messages by timestamp to show most recent messages
    return messages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB; // Sort chronologically (oldest first, newest last)
    });
  }

  goToProductListing() {
    this.router.navigate(['/product-listing']);
  }

  // Method to scroll to the bottom of messages container
  scrollToBottom(): void {
    try {
      const messagesContainer = document.querySelector('.messages-wrapper');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  get usersWithConversation() {
    const convoEmails = new Set<string>();
    this.messages.forEach(msg => {
      if (msg.sender === this.userName) {
        convoEmails.add(msg.recipient);
      }
      if (msg.recipient === this.userName) {
        convoEmails.add(msg.sender);
      }
    });
    return this.users.filter(user =>
      user.email !== this.userName && convoEmails.has(user.email)
    );
  }

  filteredUsers() {
    const term = this.searchTerm.toLowerCase();
    const filtered = this.users.filter(user =>
      user.email !== this.userName &&
      (user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
    );

    return filtered.sort((a, b) => {
      const unreadA = this.getUnreadCount(a.email);
      const unreadB = this.getUnreadCount(b.email);

      if (unreadA !== unreadB) {
        return unreadB - unreadA;
      }

      const lastA = this.getLastMessageTimestamp(a.email);
      const lastB = this.getLastMessageTimestamp(b.email);
      return lastB - lastA;
    });
  }

  private getLastMessageTimestamp(userEmail: string): number {
    const userMessages = this.messages.filter(
      m => (m.sender === this.userName && m.recipient === userEmail) ||
           (m.sender === userEmail && m.recipient === this.userName)
    );

    if (userMessages.length === 0) {
      return 0;
    }

    return userMessages.reduce((latest, message) => {
      const time = this.getMessageTimeMs(message);
      return time > latest ? time : latest;
    }, 0);
  }

  // Method to format timestamp for display
  formatMessageTime(timestamp?: string | Date): string {
    if (!timestamp) {
      return 'now';
    }

    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Convert to GMT+8 timezone
    const gmt8Offset = 8 * 60; // 8 hours in minutes
    const messageGMT8 = new Date(messageDate.getTime() + (gmt8Offset * 60 * 1000));
    const nowGMT8 = new Date(now.getTime() + (gmt8Offset * 60 * 1000));
    
    const diffInMs = nowGMT8.getTime() - messageGMT8.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    // If message is less than 1 minute old
    if (diffInMinutes < 1) {
      return 'now';
    }
    // If message is less than 1 hour old
    else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    // If message is less than 24 hours old
    else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    // If message is less than 7 days old
    else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    // For older messages, show the actual date in GMT+8
    else {
      return messageGMT8.toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' });
    }
  }

  // Method to format time for message bubbles (shows actual time)
  formatMessageBubbleTime(timestamp?: string | Date): string {
    if (!timestamp) {
      return 'now';
    }

    const messageDate = new Date(timestamp);
    const now = new Date();
    
    // Convert to GMT+8 timezone for comparison
    const messageGMT8 = new Date(messageDate.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const nowGMT8 = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Singapore"}));
    const isToday = messageGMT8.toDateString() === nowGMT8.toDateString();
    
    if (isToday) {
      // Show time in HH:MM format for today's messages in GMT+8
      return messageDate.toLocaleTimeString('en-US', { 
        timeZone: 'Asia/Singapore',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      // Show date and time for older messages in GMT+8
      return messageDate.toLocaleDateString('en-US', { timeZone: 'Asia/Singapore' }) + ' ' + 
             messageDate.toLocaleTimeString('en-US', { 
               timeZone: 'Asia/Singapore',
               hour: '2-digit', 
               minute: '2-digit',
               hour12: true 
             });
    }
  }

  // Method to get the last message time for a user in the sidebar
  getLastMessageTime(user: { name: string, email: string }): string {
    // Find the most recent message with this user
    const userMessages = this.messages.filter(
      m => (m.sender === this.userName && m.recipient === user.email) ||
           (m.sender === user.email && m.recipient === this.userName)
    );

    if (userMessages.length === 0) {
      return 'No messages';
    }

    // Sort by timestamp to get the most recent
    const lastMessage = userMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })[0];

    return this.formatMessageTime(lastMessage.timestamp);
  }

  // Method to get the last message content for preview
  getLastMessageContent(user: { name: string, email: string }): string {
    // Find the most recent message with this user
    const userMessages = this.messages.filter(
      m => (m.sender === this.userName && m.recipient === user.email) ||
           (m.sender === user.email && m.recipient === this.userName)
    );

    if (userMessages.length === 0) {
      return 'Start a conversation...';
    }

    // Sort by timestamp to get the most recent
    const lastMessage = userMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })[0];

    // Truncate long messages for preview
    const maxLength = 30;
    const content = lastMessage.content;
    const prefix = lastMessage.sender === this.userName ? 'You: ' : '';
    const fullMessage = prefix + content;
    
    return fullMessage.length > maxLength 
      ? fullMessage.substring(0, maxLength) + '...' 
      : fullMessage;
  }
}
