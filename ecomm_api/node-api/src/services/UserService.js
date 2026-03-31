const bcrypt = require("bcrypt");
const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const BaseService = require("./BaseService");

class UserService extends BaseService {
  constructor(db) {
    super(db);
  }

  async getAllEmails() {
    const rows = await this.db.query("SELECT name, email FROM users");
    return rows;
  }

  async getAllUsers(currentUserEmail = null) {
    let isAdmin = false;

    if (currentUserEmail) {
      const roleRows = await this.db.query("SELECT role FROM users WHERE email = ?", [currentUserEmail]);
      isAdmin = roleRows[0] && roleRows[0].role === "admin";
    }

    if (isAdmin) {
      return this.db.query(
        "SELECT id, name, email, role FROM users WHERE (role IS NULL OR role != 'admin') AND email != ?",
        [currentUserEmail]
      );
    }

    return this.db.query("SELECT id, name, email, role FROM users WHERE role = 'admin'");
  }

  async checkLoginStatus(user = null) {
    return {
      loggedIn: Boolean(user && user.user_id),
      user: user || null
    };
  }

  async loginUser(data) {
    const email = data && data.email ? String(data.email) : "";
    const password = data && data.password ? String(data.password) : "";

    const users = await this.db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    const user = users[0];

    if (!user) {
      return { error: "Invalid email or password" };
    }

    const storedHash = String(user.password || "");
    const normalizedHash = storedHash.startsWith("$2y$")
      ? `$2b$${storedHash.slice(4)}`
      : storedHash;

    const ok = await bcrypt.compare(password, normalizedHash);
    if (!ok) {
      return { error: "Invalid email or password" };
    }

    const token = crypto.randomBytes(16).toString("hex");
    return {
      token,
      user_id: user.id,
      email: user.email
    };
  }

  async logoutUser() {
    return { success: true, message: "Logged out" };
  }

  async registerUser(data) {
    const name = data && data.name ? String(data.name) : null;
    const email = data && data.email ? String(data.email) : "";
    const cellphone = data && data.cellphone ? String(data.cellphone) : null;
    const password = data && data.password ? String(data.password) : "";
    const hash = await bcrypt.hash(password, 10);

    await this.db.query(
      "INSERT INTO users (name, email, cellphone, password) VALUES (?, ?, ?, ?)",
      [name, email, cellphone, hash]
    );

    return { message: "User was registered successfully." };
  }

  async setSession(data) {
    const userId = data && (data.userId || data.user_id);
    if (!userId) {
      return { success: false, error: "user_id is required" };
    }

    const token = crypto.randomBytes(16).toString("hex");

    return {
      success: true,
      token,
      user_id: userId
    };
  }

  async validateToken(token) {
    if (/^[a-fA-F0-9]{32}$/.test(String(token || ""))) {
      return { valid: true };
    }

    return { valid: false, message: "Invalid token." };
  }

  async getUserProfile(userId) {
    const rows = await this.db.query(
      "SELECT id, name, email, phone, address, bio, profile_image, created_at, updated_at FROM users WHERE id = ?",
      [userId]
    );

    if (!rows[0]) {
      return { error: "User not found." };
    }

    return rows[0];
  }

  async updateUserProfile(userId, data) {
    const exists = await this.db.query("SELECT id FROM users WHERE id = ?", [userId]);
    if (!exists[0]) {
      return { error: "User not found." };
    }

    const allowedFields = ["name", "email", "phone", "address", "bio", "profile_image"];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data || {}, field)) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return { error: "No valid fields provided for update." };
    }

    updates.push("updated_at = NOW()");
    values.push(userId);

    await this.db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    return this.getUserProfile(userId);
  }

  async changeUserPassword(userId, currentPassword, newPassword) {
    const rows = await this.db.query("SELECT password FROM users WHERE id = ?", [userId]);
    const user = rows[0];

    if (!user) {
      return { error: "User not found." };
    }

    const ok = await bcrypt.compare(String(currentPassword || ""), user.password || "");
    if (!ok) {
      return { error: "Current password is incorrect." };
    }

    const hash = await bcrypt.hash(String(newPassword || ""), 10);
    await this.db.query("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", [hash, userId]);

    return { message: "Password changed successfully." };
  }

  async uploadProfileImage(userId, imageFile) {
    if (!imageFile) {
      return { error: "No image uploaded." };
    }

    const allowed = ["image/jpeg", "image/png", "image/gif"];
    if (!allowed.includes(imageFile.mimetype)) {
      return { error: "Invalid file type. Only JPG, PNG, and GIF are allowed." };
    }

    if (Number(imageFile.size || 0) > 5 * 1024 * 1024) {
      return { error: "File size too large. Maximum 5MB allowed." };
    }

    const configured = process.env.PROFILE_UPLOAD_DIR
      ? process.env.PROFILE_UPLOAD_DIR
      : path.resolve(__dirname, "../../../../ecomm-images/profile");
    const uploadDir = path.isAbsolute(configured)
      ? configured
      : path.resolve(__dirname, "../../../", configured);

    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(imageFile.originalname || "").replace(".", "") || "jpg";
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 1e6)}_profile.${ext}`;
    const targetPath = path.join(uploadDir, fileName);

    await fs.rename(imageFile.path, targetPath);

    const relativeDir = (process.env.PROFILE_IMAGE_RELATIVE_DIR || "ecomm-images/profile").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    const imagePath = `${relativeDir}/${fileName}`;

    await this.db.query("UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?", [imagePath, userId]);

    return {
      message: "Profile image uploaded successfully.",
      imagePath
    };
  }
}

module.exports = UserService;
