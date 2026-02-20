# VideoX

A full-featured video streaming platform inspired by YouTube, built with JavaScript technologies.

## Features

- User authentication and authorization
- Video upload and management
- Commenting on videos
- Like and dislike videos
- Search for videos
- Playlist creation and management
- Subscribe and unsubscribe to users
- Like and dislike comments
- Tweet creation and management
- Like and dislike tweets

## Technologies

- Node.js
- Express.js
- MongoDB
- Mongoose
- Cloudinary
- JWT
- Bcrypt
- Multer
- Nodemailer

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the server: `npm run dev`

## API Routes

**Base URL:** `/api/v1`

### User & Authentication

- POST `/users/register`

Register a new user account.

- POST `/users/login`

Authenticate a user and return a JWT token.

- POST `/users/account-update`

Update user profile information.

- POST `/users/change-password`

Change the user’s account password.

- POST `/users/delete-account`

Permanently delete the user account.

- GET `/users/channel/:username`

Retrieve public channel profile information for a user.

- GET `/users/watch-history`

Fetch the authenticated user’s watch history.

### Videos

- POST `/videos/publish`

Upload and publish a new video with metadata and thumbnail.

- GET `/videos/user/:username`

Retrieve all videos uploaded by a specific user.

- GET `/videos/v/:videoId`

Fetch detailed information for a single video.

- PUT `/videos/v/:videoId/update`

Update video title or description.

- DELETE `/videos/v/:videoId/delete`

Delete a video owned by the authenticated user.

- GET `/videos/search?query=`

Search videos by keyword.

### Playlists

- POST `/playlists`

Create a new playlist.

- PUT `/playlists/:playlistId`

Update playlist details.

- PATCH `/playlists/add-videos/:videoId/:playlistId`

Add a video to an existing playlist.

- GET `/playlists/:playlistId`

Retrieve details of a specific playlist.

- GET `/playlists/user-playlists`

Fetch all playlists created by the authenticated user.

### Comments

- POST `/comments/:videoId`

Add a comment to a video.

- PATCH `/comments/c/:commentId`

Update an existing comment.

- DELETE `/comments/c/:commentId`

Delete a comment.

- GET `/comments/video-comments/:videoId`

Retrieve all comments for a video.

### Subscriptions

- POST `/subscriptions/c/:channelId`

Subscribe or unsubscribe from a channel.

- GET `/subscriptions/c/:channelId`

Retrieve subscribers for a channel.

- GET `/subscriptions/u/subscribed-channels`

Fetch all channels subscribed by the authenticated user.

### Likes

- POST `/likes/v/:videoId`

Like or unlike a video.

- GET `/likes/likedVideos`

Retrieve all videos liked by the authenticated user.

- POST `/likes/c/:commentId`

Like or unlike a comment.

- POST `/likes/t/:tweetId`

Like or unlike a tweet.

### Tweets

- POST `/tweets/create`

Create a new tweet.

- GET `/tweets/user/:userId`

Retrieve tweets created by a specific user.

- PATCH `/tweets/update/:tweetId`

Update a tweet.

- DELETE `/tweets/delete/:tweetId`

Delete a tweet.

### Password Recovery

- POST `/auth/forgot-password`

Request an OTP for password reset.

- POST `/auth/reset-password`

Reset password using OTP.

## Usage

1. Register a new user
2. Log in to your account
3. Upload videos
4. Comment on videos
5. Like and dislike videos
6. Search for videos
7. Create and manage playlists
8. Subscribe and unsubscribe to users
9. Like and dislike comments
10. Create and manage tweets
11. Like and dislike tweets

## Contributing

Contributions, issues, and feature requests are welcome.
Please open an issue or submit a pull request.

## Acknowledgments

Inspired by YouTube and modern video-sharing platforms.
