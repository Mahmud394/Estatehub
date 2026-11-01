-- EstateHub database schema (MySQL 8+)
-- Run with:  mysql -u root -p < database/schema.sql
-- Prices are stored in BDT. Sizes are stored in square feet (sqft) for buildings and in decimal for land (also sqft).

CREATE DATABASE IF NOT EXISTS estatehub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE estatehub;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs, reports, notifications, reviews, favorites, messages,
  conversations, comments, property_images, properties, broker_profiles, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------
-- users: every account (client, broker, admin)
-- ---------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(30) NULL,
  avatar_url    VARCHAR(500) NULL,
  role          ENUM('client','broker','admin') NOT NULL DEFAULT 'client',
  status        ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- broker_profiles: extra data + verification state for brokers
-- ---------------------------------------------------------------
CREATE TABLE broker_profiles (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL UNIQUE,
  company_name        VARCHAR(160) NULL,
  bio                 TEXT NULL,
  service_areas       VARCHAR(300) NULL,  -- comma-separated, e.g. "Uttara, Mirpur"
  license_number      VARCHAR(80) NULL,
  verification_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  verified_at         TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_broker_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_broker_verification (verification_status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------
CREATE TABLE properties (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  broker_id           INT UNSIGNED NOT NULL,           -- users.id of the broker
  title               VARCHAR(200) NOT NULL,
  description         TEXT NOT NULL,
  category            ENUM('land','apartment','house','commercial') NOT NULL,
  purpose             ENUM('sale','rent') NOT NULL,
  price               DECIMAL(15,2) NOT NULL CHECK (price >= 0),
  currency            CHAR(3) NOT NULL DEFAULT 'BDT',
  size                DECIMAL(12,2) NOT NULL CHECK (size > 0),
  size_unit           ENUM('sqft') NOT NULL DEFAULT 'sqft',
  bedrooms            TINYINT UNSIGNED NULL,
  bathrooms           TINYINT UNSIGNED NULL,
  city                VARCHAR(80) NOT NULL,            -- e.g. Dhaka
  area                VARCHAR(80) NOT NULL,            -- e.g. Uttara (public)
  address_line        VARCHAR(255) NULL,               -- precise address, only shown to authorized users
  approval_status     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason    VARCHAR(500) NULL,
  availability_status ENUM('available','sold','rented','unavailable') NOT NULL DEFAULT 'available',
  is_demo             TINYINT(1) NOT NULL DEFAULT 0,   -- 1 = seed/demo content
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_property_broker FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prop_public (approval_status, availability_status, category, purpose),
  INDEX idx_prop_location (city, area),
  INDEX idx_prop_price (price),
  INDEX idx_prop_broker (broker_id),
  FULLTEXT INDEX ft_prop_search (title, description)
) ENGINE=InnoDB;

CREATE TABLE property_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  image_url   VARCHAR(500) NOT NULL,
  is_primary  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_image_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_image_property (property_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- comments (public, on a property)
-- ---------------------------------------------------------------
CREATE TABLE comments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  body        VARCHAR(1000) NOT NULL,
  status      ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_comment_property (property_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- private messaging: one conversation per (property, client, broker)
-- ---------------------------------------------------------------
CREATE TABLE conversations (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  property_id INT UNSIGNED NULL,
  client_id   INT UNSIGNED NOT NULL,
  broker_id   INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_conv_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
  CONSTRAINT fk_conv_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_conv_broker FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_conversation (property_id, client_id, broker_id),
  INDEX idx_conv_client (client_id),
  INDEX idx_conv_broker (broker_id)
) ENGINE=InnoDB;

CREATE TABLE messages (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT UNSIGNED NOT NULL,
  sender_id       INT UNSIGNED NOT NULL,
  body            VARCHAR(2000) NOT NULL,
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_msg_conv (conversation_id, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- favorites: a user can favorite a property only once
-- ---------------------------------------------------------------
CREATE TABLE favorites (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  property_id INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  UNIQUE KEY uq_favorite (user_id, property_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- reviews: a client reviews a broker (one review per client per broker)
-- ---------------------------------------------------------------
CREATE TABLE reviews (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  broker_id   INT UNSIGNED NOT NULL,
  client_id   INT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        VARCHAR(1000) NOT NULL,
  status      ENUM('visible','hidden') NOT NULL DEFAULT 'visible',
  is_demo     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_review_broker FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_client FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_review (broker_id, client_id),
  INDEX idx_review_broker (broker_id, status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- notifications (in-app)
-- ---------------------------------------------------------------
CREATE TABLE notifications (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    INT UNSIGNED NOT NULL,
  type       VARCHAR(40) NOT NULL,           -- e.g. new_comment, new_message
  title      VARCHAR(160) NOT NULL,
  link       VARCHAR(255) NULL,              -- app route, e.g. /broker/messages/12
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user (user_id, is_read, created_at)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- reports: users report a property, comment, or user
-- ---------------------------------------------------------------
CREATE TABLE reports (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT UNSIGNED NOT NULL,
  target_type ENUM('property','comment','user','review') NOT NULL,
  target_id   INT UNSIGNED NOT NULL,
  reason      VARCHAR(500) NOT NULL,
  status      ENUM('open','resolved','dismissed') NOT NULL DEFAULT 'open',
  handled_by  INT UNSIGNED NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_handler FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_report_status (status)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------
-- audit_logs: record of important admin moderation actions
-- ---------------------------------------------------------------
CREATE TABLE audit_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT UNSIGNED NULL,
  action      VARCHAR(60) NOT NULL,          -- e.g. approve_property, suspend_user
  target_type VARCHAR(30) NOT NULL,
  target_id   INT UNSIGNED NOT NULL,
  details     VARCHAR(500) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;
