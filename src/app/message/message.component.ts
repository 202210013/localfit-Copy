import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';

interface Message {
  sender: string;
  recipient: string;
  content: string;
  timestamp?: string | Date;
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
  userName = localStorage.getItem('user_email') || 'User';
  users: User[] = [];
  messageForm: FormGroup;
  messages: Message[] = [];
  selectedRecipient: User | null = null;
  searchTerm: string = '';

  // Add these properties to your component class
  sidebarOpen = false;
  isMobile = false;

  private socket: Socket;

  constructor(private fb: FormBuilder, private router: Router, private http: HttpClient) {
    this.messageForm = this.fb.group({
      content: ['', [Validators.required, Validators.maxLength(250)]]
    });
    this.socket = io('https://localfit.onrender.com');
  }
  ngOnInit() {
     this.http.get<User[]>(`https://api.localfit.store/ecomm_api/all-users?currentUser=${this.userName}`)
  .subscribe(users => {
    this.users = users;
  });

    this.socket.on('all-messages', (msgs: Message[]) => {
      this.messages = msgs;
    });
    this.socket.on('receive-message', (msg: Message) => {
      this.messages.push(msg);
      // Scroll to bottom if the message is for the currently selected conversation
      if (this.selectedRecipient && 
          ((msg.sender === this.selectedRecipient.email && msg.recipient === this.userName) ||
           (msg.sender === this.userName && msg.recipient === this.selectedRecipient.email))) {
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    });

    this.isMobile = window.innerWidth <= 700;
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 700;
      if (!this.isMobile) this.sidebarOpen = false;
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }

  selectRecipient(user: User) {
  if (user.email !== this.userName) {
    this.selectedRecipient = user;
    this.messageForm.reset();
    // Fetch messages from backend for this conversation
    this.http.get<Message[]>(
      `https://api.localfit.store/ecomm_api/messages?user1=${this.userName}&user2=${user.email}`
    ).subscribe(msgs => {
      // Merge new messages, avoid duplicates
      const all = [...this.messages];
      msgs.forEach(m => {
        if (!all.find(existing =>
          existing.sender === m.sender &&
          existing.recipient === m.recipient &&
          existing.content === m.content
        )) {
          all.push(m);
        }
      });
      this.messages = all;
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
      sender: this.userName,
      recipient: this.selectedRecipient.email,
      content: this.messageForm.value.content,
      timestamp: new Date(nowGMT8) // Add current timestamp in GMT+8
    };
    this.socket.emit('send-message', msg);
    // Save to backend
     this.http.post('https://api.localfit.store/ecomm_api/send-message', msg)
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
    return this.users.filter(user =>
      user.email !== this.userName &&
      (user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
    );
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
