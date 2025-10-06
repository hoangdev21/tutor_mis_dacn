const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get user preferences
// @route   GET /api/settings/preferences
// @access  Private
exports.getPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('preferences');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        res.json({
            success: true,
            preferences: user.preferences || {}
        });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Update user preferences
// @route   PUT /api/settings/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
    try {
        const { preferences } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { preferences },
            { new: true, runValidators: true }
        ).select('preferences');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật cài đặt thành công',
            preferences: user.preferences
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Update account information
// @route   PUT /api/settings/account
// @access  Private
exports.updateAccount = async (req, res) => {
    try {
        const { displayName, phone, language, timezone, theme } = req.body;

        const updateData = {};
        if (displayName) updateData.name = displayName;
        if (phone) updateData.phone = phone;
        if (language || timezone || theme) {
            updateData['preferences.language'] = language;
            updateData['preferences.timezone'] = timezone;
            updateData['preferences.theme'] = theme;
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật tài khoản thành công',
            user
        });
    } catch (error) {
        console.error('Update account error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Change password
// @route   POST /api/settings/change-password
// @access  Private
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có ít nhất 8 ký tự'
            });
        }

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Check current password
        const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isPasswordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Mật khẩu hiện tại không đúng'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        
        // Update password changed date
        user.passwordChangedAt = Date.now();
        
        await user.save();

        res.json({
            success: true,
            message: 'Đổi mật khẩu thành công'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Logout from all devices
// @route   POST /api/settings/logout-all
// @access  Private
exports.logoutAllDevices = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Clear all sessions (implementation depends on your auth strategy)
        // For JWT, you might want to blacklist all tokens or change a secret
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        res.json({
            success: true,
            message: 'Đã đăng xuất tất cả thiết bị'
        });
    } catch (error) {
        console.error('Logout all devices error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Request data download
// @route   POST /api/settings/download-data
// @access  Private
exports.downloadData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // In a real implementation, you would:
        // 1. Gather all user data from various collections
        // 2. Create a ZIP file or JSON export
        // 3. Send via email or provide download link
        
        // For now, we'll just send a confirmation
        res.json({
            success: true,
            message: 'Yêu cầu tải dữ liệu đã được gửi. Bạn sẽ nhận được email trong vòng 24 giờ.'
        });
    } catch (error) {
        console.error('Download data error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Clear activity history
// @route   DELETE /api/settings/clear-history
// @access  Private
exports.clearHistory = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // Clear search history and activity logs
        user.searchHistory = [];
        user.activityLog = [];
        await user.save();

        res.json({
            success: true,
            message: 'Đã xóa lịch sử hoạt động'
        });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Deactivate account
// @route   POST /api/settings/deactivate
// @access  Private
exports.deactivateAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        user.status = 'inactive';
        user.deactivatedAt = Date.now();
        await user.save();

        res.json({
            success: true,
            message: 'Tài khoản đã được vô hiệu hóa'
        });
    } catch (error) {
        console.error('Deactivate account error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Delete account permanently
// @route   DELETE /api/settings/delete-account
// @access  Private
exports.deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        // In a real implementation, you would:
        // 1. Delete or anonymize all related data
        // 2. Remove from all related collections
        // 3. Cancel subscriptions, etc.
        
        await User.findByIdAndDelete(req.user._id);

        res.json({
            success: true,
            message: 'Tài khoản đã được xóa vĩnh viễn'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Get security settings
// @route   GET /api/settings/security
// @access  Private
exports.getSecuritySettings = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('twoFactorEnabled loginHistory');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        res.json({
            success: true,
            security: {
                twoFactorEnabled: user.twoFactorEnabled || false,
                loginHistory: user.loginHistory || []
            }
        });
    } catch (error) {
        console.error('Get security settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

// @desc    Toggle 2FA
// @route   POST /api/settings/2fa/toggle
// @access  Private
exports.toggle2FA = async (req, res) => {
    try {
        const { enabled } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { twoFactorEnabled: enabled },
            { new: true }
        ).select('twoFactorEnabled');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Người dùng không tồn tại'
            });
        }

        res.json({
            success: true,
            message: enabled ? 'Đã bật xác thực 2 yếu tố' : 'Đã tắt xác thực 2 yếu tố',
            twoFactorEnabled: user.twoFactorEnabled
        });
    } catch (error) {
        console.error('Toggle 2FA error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
};

module.exports = {
    getPreferences: exports.getPreferences,
    updatePreferences: exports.updatePreferences,
    updateAccount: exports.updateAccount,
    changePassword: exports.changePassword,
    logoutAllDevices: exports.logoutAllDevices,
    downloadData: exports.downloadData,
    clearHistory: exports.clearHistory,
    deactivateAccount: exports.deactivateAccount,
    deleteAccount: exports.deleteAccount,
    getSecuritySettings: exports.getSecuritySettings,
    toggle2FA: exports.toggle2FA
};
