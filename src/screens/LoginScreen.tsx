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
    Image,
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
        await Linking.openURL(webUrl).catch(() => {});
    }
}

// Warm-ink + amber identity. Ink carries authority/security, amber is the
// single accent used sparingly — the signature moment is the card
// overlapping the hero, plus the amber underline that draws in on focus.
const PALETTE = {
    ink: '#14141F',
    inkSoft: '#23222E',
    bg: '#FBFAF8',
    card: '#FFFFFF',
    accent: '#F2A93B',
    accentDeep: '#D98C1F',
    text: '#181820',
    muted: '#8B8B9A',
    mutedOnInk: 'rgba(255,255,255,0.6)',
    border: '#ECE9E3',
    error: '#E0533D',
    errorBg: '#FBEAE6',
    placeholder: '#B5B4C0',
};

function FloatingField({
    label,
    icon,
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
}: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
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
}) {
    const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
    const underline = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(anim, {
            toValue: focused || value ? 1 : 0,
            duration: 150,
            useNativeDriver: false,
        }).start();
        Animated.timing(underline, {
            toValue: focused ? 1 : 0,
            duration: 220,
            useNativeDriver: false,
        }).start();
    }, [focused, value]);

    const labelStyle = {
        top: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 6] }),
        fontSize: anim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
        color: focused ? PALETTE.accentDeep : PALETTE.muted,
    };

    return (
        <View style={[styles.fieldWrapper, focused && styles.fieldWrapperFocused]}>
            <Ionicons
                name={icon}
                size={18}
                color={focused ? PALETTE.accentDeep : PALETTE.placeholder}
                style={styles.fieldIcon}
            />
            <View style={styles.fieldBody}>
                <Animated.Text style={[styles.floatingLabel, labelStyle]}>{label}</Animated.Text>
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
                    placeholderTextColor={PALETTE.placeholder}
                />
            </View>
            {showSecureToggle && (
                <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons
                        name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={PALETTE.placeholder}
                    />
                </TouchableOpacity>
            )}
            <Animated.View
                style={[
                    styles.fieldUnderline,
                    {
                        backgroundColor: PALETTE.accent,
                        transform: [{ scaleX: underline }],
                    },
                ]}
            />
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

    // Entrance sequence: hero settles first, then the card rises and fades
    // in on top of it — a single orchestrated moment instead of scattered effects.
    const heroFade = useRef(new Animated.Value(0)).current;
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardRise = useRef(new Animated.Value(18)).current;
    const errorFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(heroFade, { toValue: 1, duration: 380, useNativeDriver: true }),
            Animated.parallel([
                Animated.timing(cardFade, { toValue: 1, duration: 320, useNativeDriver: true }),
                Animated.spring(cardRise, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }),
            ]),
        ]).start();
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
            <StatusBar style="auto" />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View style={[styles.hero, { opacity: heroFade }]}>
                            <View style={styles.logoMark}>
                                <Image
                                    source={require('@/assets/images/Gemini_Generated_Image_8fukyb8fukyb8fuk__1_-removebg-preview.png')}
                                    style={{ width: 100, height: 100 }}
                                    resizeMode="contain"
                                />
                            </View>

                            <Text style={styles.heroTitle}>Xush kelibsiz</Text>

                        </Animated.View>

                        <Animated.View
                            style={[
                                styles.card,
                                {
                                    opacity: cardFade,
                                    transform: [{ translateY: cardRise }],
                                },
                            ]}
                        >
                            <FloatingField
                                label="Email"
                                icon="mail-outline"
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
                            />

                            <View style={{ height: 20 }} />

                            <FloatingField
                                label="Parol"
                                icon="lock-closed-outline"
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
                            />

                            <TouchableOpacity
                                style={styles.forgotLink}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                onPress={handleForgotPassword}
                            >
                                <Text style={styles.forgotText}>Parolni unutdingizmi?</Text>
                            </TouchableOpacity>

                            {errorMessage && (
                                <Animated.View style={[styles.errorBox, { opacity: errorFade }]}>
                                    <Ionicons name="alert-circle" size={16} color={PALETTE.error} />
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </Animated.View>
                            )}

                            <Animated.View style={{ transform: [{ scale: pressScale }] }}>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={handleSubmit}
                                    onPressIn={() => canSubmit && animatePress(0.97)}
                                    onPressOut={() => animatePress(1)}
                                    disabled={!canSubmit}
                                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color={PALETTE.ink} />
                                    ) : (
                                        <>
                                            <Text style={styles.submitBtnText}>Kirish</Text>
                                            <Ionicons name="arrow-forward" size={18} color={PALETTE.ink} style={{ marginLeft: 6 }} />
                                        </>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>

                             
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

    scrollContent: {
        flexGrow: 1,
        paddingTop: 65,
        // justifyContent: 'center',
        paddingBottom: 32,
    },

    // Hero: full ink block, rounded bottom, holds the brand identity that
    // was previously missing from the screen entirely.
    hero: {
        backgroundColor: PALETTE.bg,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        // paddingTop: 36,
        paddingBottom: 20,
        paddingHorizontal: 28,
        alignItems: 'center',
    },
    logoMark: {
        width: 110,
        height: 100,
        borderRadius: 16,
        backgroundColor: PALETTE.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
    },
    heroEyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 2.5,
        color: PALETTE.accent,
        marginBottom: 8,
    },
    heroTitle: {
        fontSize: 26,
        lineHeight: 32,
        fontWeight: '700',
        color: PALETTE.text,
        marginBottom: 6,
    },
    heroSubtitle: {
        fontSize: 13,
        color: PALETTE.mutedOnInk,
        textAlign: 'center',
    },
 
    card: {
        backgroundColor: PALETTE.card,
        marginHorizontal: 20,
        marginTop: 0,
        borderRadius: 8,
        padding: 26,
        shadowColor: PALETTE.placeholder,
        shadowOpacity: 0.14,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
        elevation: 20,
    },

    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'transparent',
    },
    fieldWrapperFocused: {
        // subtle lift so the focused field reads clearly without relying on
        // the underline animation alone
    },
    fieldIcon: {
        marginRight: 12,
    },
    fieldBody: {
        flex: 1,
    },
    floatingLabel: {
        position: 'absolute',
        left: 0,
        fontWeight: '600',
    },
    fieldInput: {
        fontSize: 15,
        color: PALETTE.text,
        paddingTop: 22,
        paddingBottom: 4,
    },
    fieldUnderline: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        borderRadius: 1,
    },

    forgotLink: {
        alignSelf: 'flex-end',
        marginTop: 12,
        marginBottom: 4,
    },
    forgotText: {
        fontSize: 13,
        color: PALETTE.accentDeep,
        fontWeight: '600',
    },

    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
        backgroundColor: PALETTE.errorBg,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    errorText: {
        color: PALETTE.error,
        fontSize: 13,
        flexShrink: 1,
    },

    submitBtn: {
        marginTop: 24,
        backgroundColor: PALETTE.accent,
        borderRadius: 14,
        paddingVertical: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: {
        backgroundColor: '#EFE4CE',
    },
    submitBtnText: {
        color: PALETTE.ink,
        fontSize: 16,
        fontWeight: '700',
    },

    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 22,
    },
    footerText: {
        fontSize: 13,
        color: PALETTE.muted,
    },
    footerLink: {
        fontSize: 13,
        color: PALETTE.accentDeep,
        fontWeight: '700',
    },
});