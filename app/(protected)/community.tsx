import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle, Heart, Send, Plus, X, User as UserIcon, Trash2, ImageIcon } from 'lucide-react-native';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface Comment {
  id: string;
  post_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

interface Post {
  id: string;
  user_email: string;
  content: string;
  image_url?: string;
  likes: number;
  created_at: string;
  liked_by?: string[];
  comments?: Comment[];
  comment_count?: number;
  user_profile_image?: string;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const ADMIN_EMAIL = 'sankalpgupta7860@gmail.com';
  const isAdmin = user?.email === ADMIN_EMAIL;
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState('');
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingPost, setUploadingPost] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchUserProfiles = async (emails: string[]) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email, profile_image_url')
        .in('email', emails);

      if (data) {
        const profiles: Record<string, string> = {};
        data.forEach(profile => {
          if (profile.profile_image_url) {
            profiles[profile.email] = profile.profile_image_url;
          }
        });
        setUserProfiles(profiles);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data: postsData, error: postsError } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch user profiles
      const uniqueEmails = [...new Set(postsData?.map(p => p.user_email) || [])];
      await fetchUserProfiles(uniqueEmails);

      // Fetch comment counts for each post
      const postsWithComments = await Promise.all(
        (postsData || []).map(async (post) => {
          const { count } = await supabase
            .from('post_comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          return { ...post, comment_count: count || 0 };
        })
      );

      setPosts(postsWithComments);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedImage) {
      Alert.alert('Error', 'Please write something or add an image');
      return;
    }

    setUploadingPost(true);
    try {
      let imageUrl = null;

      // Upload image to Cloudinary if selected
      if (selectedImage) {
        const cloudinaryResponse = await uploadToCloudinary(selectedImage);
        imageUrl = cloudinaryResponse.secureUrl;
      }

      const { error } = await supabase.from('community_posts').insert([
        {
          user_email: user?.email,
          content: newPost.trim(),
          image_url: imageUrl,
          likes: 0,
          liked_by: [],
        },
      ]);

      if (error) throw error;

      Alert.alert('Success', 'Post created successfully!');
      setNewPost('');
      setSelectedImage(null);
      setModalVisible(false);
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      Alert.alert('Error', error.message || 'Failed to create post');
    } finally {
      setUploadingPost(false);
    }
  };

  const handleLike = async (post: Post) => {
    try {
      const likedBy = post.liked_by || [];
      const hasLiked = likedBy.includes(user?.email || '');
      
      const newLikedBy = hasLiked
        ? likedBy.filter(email => email !== user?.email)
        : [...likedBy, user?.email || ''];

      const { error } = await supabase
        .from('community_posts')
        .update({
          likes: hasLiked ? post.likes - 1 : post.likes + 1,
          liked_by: newLikedBy,
        })
        .eq('id', post.id);

      if (error) throw error;
      fetchPosts();
    } catch (error: any) {
      console.error('Error updating like:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete comments first
              await supabase.from('post_comments').delete().eq('post_id', postId);
              
              // Delete post
              const { error } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', postId);

              if (error) throw error;
              Alert.alert('Success', 'Post deleted successfully');
              fetchPosts();
            } catch (error: any) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
  };

  const openComments = async (postId: string) => {
    setSelectedPostId(postId);
    setCommentModalVisible(true);
    await fetchComments(postId);
  };

  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId ? { ...post, comments: data || [] } : post
        )
      );
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedPostId) return;

    try {
      const { error } = await supabase.from('post_comments').insert([
        {
          post_id: selectedPostId,
          user_email: user?.email,
          content: newComment.trim(),
        },
      ]);

      if (error) throw error;

      setNewComment('');
      await fetchComments(selectedPostId);
      await fetchPosts();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('post_comments')
                .delete()
                .eq('id', commentId);

              if (error) throw error;
              await fetchComments(postId);
              await fetchPosts();
            } catch (error: any) {
              console.error('Error deleting comment:', error);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>Community</Text>
              {isAdmin && (
                <View style={styles.adminBadgeHeader}>
                  <Text style={styles.adminBadgeTextHeader}>ADMIN</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>Share your thoughts</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus color="white" size={24} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle color="#9ca3af" size={64} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>Be the first to share something!</Text>
          </View>
        ) : (
          posts.map((post) => {
            const hasLiked = post.liked_by?.includes(user?.email || '');
            return (
              <View key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.userAvatar}>
                    {userProfiles[post.user_email] ? (
                      <Image 
                        source={{ uri: userProfiles[post.user_email] }} 
                        style={styles.avatarImage}
                      />
                    ) : (
                      <UserIcon color="#6366f1" size={20} />
                    )}
                  </View>
                  <View style={styles.postInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{post.user_email}</Text>
                      {post.user_email === ADMIN_EMAIL && (
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
                  </View>
                </View>
                <Text style={styles.postContent}>{post.content}</Text>
                {post.image_url && (
                  <Image 
                    source={{ uri: post.image_url }} 
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.postActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleLike(post)}
                  >
                    <Heart
                      color={hasLiked ? '#ef4444' : '#6b7280'}
                      size={20}
                      fill={hasLiked ? '#ef4444' : 'none'}
                    />
                    <Text style={[styles.actionText, hasLiked && styles.likedText]}>
                      {post.likes}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openComments(post.id)}
                  >
                    <MessageCircle color="#6b7280" size={20} />
                    <Text style={styles.actionText}>{post.comment_count || 0}</Text>
                  </TouchableOpacity>
                  {(post.user_email === user?.email || isAdmin) && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeletePost(post.id)}
                    >
                      <Trash2 color="#ef4444" size={20} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Post</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X color="#6b7280" size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll}>
                {selectedImage && (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <X color="white" size={16} />
                    </TouchableOpacity>
                  </View>
                )}
                <TextInput
                  style={styles.postInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#9ca3af"
                  value={newPost}
                  onChangeText={setNewPost}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{newPost.length}/500</Text>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                  disabled={uploadingPost}
                >
                  <ImageIcon color="#6366f1" size={20} />
                  <Text style={styles.imagePickerText}>Add Image</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.submitButton, uploadingPost && styles.submitButtonDisabled]}
                  onPress={handleCreatePost}
                  disabled={uploadingPost}
                >
                  {uploadingPost ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Send color="white" size={20} />
                      <Text style={styles.submitButtonText}>Post</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setCommentModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.commentModalContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Comments</Text>
                <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                  <X color="#6b7280" size={24} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.commentsScroll}>
                {posts
                  .find((p) => p.id === selectedPostId)
                  ?.comments?.map((comment) => (
                    <View key={comment.id} style={styles.commentCard}>
                      <View style={styles.commentHeader}>
                        <View style={styles.userAvatar}>
                          <UserIcon color="#6366f1" size={16} />
                        </View>
                        <View style={styles.commentInfo}>
                          <View style={styles.userNameRow}>
                            <Text style={styles.commentUserName}>
                              {comment.user_email}
                            </Text>
                            {comment.user_email === ADMIN_EMAIL && (
                              <View style={styles.adminBadgeSmall}>
                                <Text style={styles.adminBadgeTextSmall}>ADMIN</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.commentDate}>
                            {formatDate(comment.created_at)}
                          </Text>
                        </View>
                        {(comment.user_email === user?.email || isAdmin) && (
                          <TouchableOpacity
                            onPress={() =>
                              handleDeleteComment(comment.id, selectedPostId!)
                            }
                          >
                            <Trash2 color="#ef4444" size={18} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  ))}
                {(!posts.find((p) => p.id === selectedPostId)?.comments ||
                  posts.find((p) => p.id === selectedPostId)?.comments?.length === 0) && (
                  <Text style={styles.noComments}>No comments yet. Be the first!</Text>
                )}
              </ScrollView>

              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  placeholderTextColor="#9ca3af"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={300}
                />
                <TouchableOpacity
                  style={styles.sendCommentButton}
                  onPress={handleAddComment}
                >
                  <Send color="#6366f1" size={20} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  adminBadgeHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  adminBadgeTextHeader: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  postContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
    fontWeight: '600',
  },
  likedText: {
    color: '#ef4444',
  },
  deleteButton: {
    marginLeft: 'auto',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalScroll: {
    maxHeight: 200,
  },
  postInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6366f1',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  commentModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  commentsScroll: {
    maxHeight: 400,
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentInfo: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  commentContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  noComments: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 14,
    paddingVertical: 40,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendCommentButton: {
    padding: 8,
    marginLeft: 8,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  adminBadgeSmall: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  adminBadgeTextSmall: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
  },
  selectedImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  imagePickerText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});
