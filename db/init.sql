create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text not null default '',
  original_name text not null,
  stored_name text not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  status text not null default 'available' check (status in ('available', 'queued', 'processing', 'ready', 'failed')),
  error_message text,
  duration_seconds double precision,
  width integer,
  height integer,
  video_codec text,
  audio_codec text,
  size_bytes bigint not null,
  archive_path text,
  remote_path text,
  remote_modified_at text,
  last_seen_at timestamptz,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists videos_owner_created_idx on videos(owner_id, created_at desc);
create index if not exists videos_visibility_status_idx on videos(visibility, status);
alter table videos add column if not exists remote_path text;
alter table videos add column if not exists remote_modified_at text;
alter table videos add column if not exists last_seen_at timestamptz;
alter table videos add column if not exists last_accessed_at timestamptz;
alter table videos drop constraint if exists videos_status_check;
alter table videos add constraint videos_status_check check (status in ('available', 'queued', 'processing', 'ready', 'failed'));
create unique index if not exists videos_remote_path_unique_idx on videos(remote_path) where remote_path is not null;
