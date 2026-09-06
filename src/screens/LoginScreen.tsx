import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    Animated,
    KeyboardAvoidingView,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    View,
    Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Telegram username to contact for password recovery / support.
const TELEGRAM_USERNAME = 'Rahimov_umidjon';

async function openTelegramProfile(username: string) {
    // Requires the withTelegramQueries config plugin (see plugins/) so that
    // Android 11+ package visibility rules let canOpenURL see Telegram.
    const appUrl = `tg://resolve?domain=${username}`;
    const webUrl = `https://t.me/${username}`;
    try {
        const canOpenApp = await Linking.canOpenURL(appUrl);
        if (canOpenApp) {
            await Linking.openURL(appUrl);
        } else {
            await Linking.openURL(webUrl);
        }
    } catch {
        await Linking.openURL(webUrl).catch(() => { });
    }
}

// Flat, single-accent identity: plain white canvas, one saturated violet used
// for the mark, the button, and links only — everything else stays neutral
// gray/ink so those three moments are what the eye catches.
const PALETTE = {
    bg: '#FFFFFF',
    violet: '#208AEF',
    violetSoft: '#DDEEFC',
    text: '#201F26',
    muted: '#9B98A3',
    fieldBg: '#F4F3F6',
    placeholder: '#ACA9B4',
    error: '#D1503B',
    errorBg: '#FBEAE6',
};

function Field({
    label,
    value,
    onChangeText,
    secure,
    showSecureToggle,
    secureVisible,
    onToggleSecure,
    focused,
    onFocus,
    onBlur,
    keyboardType,
    textContentType,
    returnKeyType,
    onSubmitEditing,
    placeholder,
}: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    secure?: boolean;
    showSecureToggle?: boolean;
    secureVisible?: boolean;
    onToggleSecure?: () => void;
    focused: boolean;
    onFocus: () => void;
    onBlur: () => void;
    keyboardType?: any;
    textContentType?: any;
    returnKeyType?: any;
    onSubmitEditing?: () => void;
    placeholder?: string;
}) {
    return (
        <View style={[styles.fieldWrapper, focused && styles.fieldWrapperFocused]}>
            <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                    style={styles.fieldInput}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    secureTextEntry={secure && !secureVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={keyboardType}
                    textContentType={textContentType}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                    placeholder={placeholder}
                    placeholderTextColor={PALETTE.placeholder}
                />
            </View>
            {showSecureToggle && (
                <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons
                        name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={PALETTE.muted}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function LoginScreen() {
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

    const canSubmit = isValidEmail(email) && password.length >= 1 && !isSubmitting;

    const pressScale = useRef(new Animated.Value(1)).current;
    const animatePress = (toValue: number) =>
        Animated.spring(pressScale, { toValue, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

    const fadeIn = useRef(new Animated.Value(0)).current;
    const errorFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        Animated.timing(errorFade, {
            toValue: errorMessage ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
        }).start();
    }, [errorMessage]);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return;
        setErrorMessage(null);
        setIsSubmitting(true);
        try {
            await login(email.trim(), password);
        } catch (err: any) {
            const serverMessage = err?.response?.data?.message;
            setErrorMessage(
                serverMessage || "Email yoki parol noto'g'ri. Qaytadan urinib ko'ring."
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [canSubmit, email, password, login]);

    const handleForgotPassword = useCallback(() => {
        openTelegramProfile(TELEGRAM_USERNAME);
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View style={[styles.flexGrow, { opacity: fadeIn }]}>
                            <View style={styles.badgeArea}>
                                <View style={[styles.dot, styles.dotTopRight]} />
                                <View style={[styles.dot, styles.dotLeft]} />
                                <View style={[styles.dot, styles.dotBottomRight]} />

                                <View style={styles.shield}>
                                    <Ionicons name="shield-outline" size={72} color={PALETTE.violet} />
                                    <Ionicons
                                        name="lock-closed"
                                        size={26}
                                        color={PALETTE.violet}
                                        style={styles.shieldLock}
                                    />
                                </View>
                            </View>

                            <Text style={styles.title}>Welcome to Saifty!</Text>
                            <Text style={styles.subtitle}>Keep your data safe!</Text>

                            <View style={styles.form}>
                                <Field
                                    label="Email"
                                    value={email}
                                    onChangeText={(t) => {
                                        setEmail(t);
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    focused={focusedField === 'email'}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    returnKeyType="next"
                                    placeholder="you@example.com"
                                />

                                <View style={{ height: 14 }} />

                                <Field
                                    label="Password"
                                    value={password}
                                    onChangeText={(t) => {
                                        setPassword(t);
                                        if (errorMessage) setErrorMessage(null);
                                    }}
                                    secure
                                    showSecureToggle
                                    secureVisible={showPassword}
                                    onToggleSecure={() => setShowPassword((v) => !v)}
                                    focused={focusedField === 'password'}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    textContentType="password"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSubmit}
                                    placeholder="••••••••••"
                                />

                                {errorMessage && (
                                    <Animated.View style={[styles.errorBox, { opacity: errorFade }]}>
                                        <Ionicons name="alert-circle" size={16} color={PALETTE.error} />
                                        <Text style={styles.errorText}>{errorMessage}</Text>
                                    </Animated.View>
                                )}

                                <Animated.View style={{ transform: [{ scale: pressScale }], marginTop: 20 }}>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        onPress={handleSubmit}
                                        onPressIn={() => canSubmit && animatePress(0.97)}
                                        onPressOut={() => animatePress(1)}
                                        disabled={!canSubmit}
                                        style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.submitBtnText}>Login</Text>
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>

                                <TouchableOpacity
                                    style={styles.forgotLink}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    onPress={handleForgotPassword}
                                >
                                    <Text style={styles.forgotText}>Forgot password?</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: PALETTE.bg },
    flex: { flex: 1 },
    flexGrow: { flexGrow: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 26,
        paddingTop: 56,
        paddingBottom: 40,
    },

    badgeArea: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        marginBottom: 8,
    },
    shield: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shieldLock: {
        position: 'absolute',
    },
    dot: {
        position: 'absolute',
        borderRadius: 999,
        backgroundColor: PALETTE.violetSoft,
    },
    dotTopRight: { width: 14, height: 14, top: 8, right: '30%' },
    dotLeft: { width: 10, height: 10, left: '22%', top: '48%' },
    dotBottomRight: { width: 18, height: 18, right: '20%', bottom: 4 },

    title: {
        fontSize: 21,
        fontWeight: '700',
        color: PALETTE.text,
        textAlign: 'center',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 14,
        color: PALETTE.muted,
        textAlign: 'center',
        marginBottom: 32,
    },

    form: {
        width: '100%',
    },

    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PALETTE.fieldBg,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    fieldWrapperFocused: {
        borderColor: PALETTE.violet,
        backgroundColor: PALETTE.bg,
    },
    fieldBody: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: 12,
        color: PALETTE.muted,
        marginBottom: 2,
    },
    fieldInput: {
        fontSize: 15,
        fontWeight: '600',
        color: PALETTE.text,
        padding: 0,
    },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
        backgroundColor: PALETTE.errorBg,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    errorText: {
        color: PALETTE.error,
        fontSize: 13,
        flexShrink: 1,
    },

    submitBtn: {
        backgroundColor: PALETTE.violet,
        borderRadius: 16,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: PALETTE.violetSoft,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },

    forgotLink: {
        alignSelf: 'center',
        marginTop: 16,
    },
    forgotText: {
        fontSize: 13.5,
        color: PALETTE.violet,
        fontWeight: '600',
    },
});