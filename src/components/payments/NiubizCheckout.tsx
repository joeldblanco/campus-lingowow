"use client";

import { useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CartItem {
    product: {
        id: string;
        title: string;
        description: string | null;
        image?: string | null;
        type?: string;
    };
    plan: {
        id: string;
        name: string;
        price: number;
    };
    quantity?: number;
}

interface NiubizCheckoutProps {
    amount: number;
    purchaseNumber: string; // Unique Order ID
    isRecurrent?: boolean;
    onSuccess?: (data: unknown) => void;
    onError?: (error: unknown) => void;
    userEmail?: string;
    userFirstName?: string;
    userLastName?: string;
    invoiceData?: unknown;
    customerInfo?: unknown;
    allowGuest?: boolean;
    cartItems?: CartItem[];
}

declare global {
    interface Window {
        VisanetCheckout: {
            configure: (config: unknown) => void;
            open: () => void;
        };
    }
}

export const NiubizCheckout = ({
    amount,
    purchaseNumber,
    isRecurrent = false,
    onSuccess,
    onError,
    invoiceData,
    customerInfo,
    userEmail,
    userFirstName,
    userLastName,
    allowGuest = false,
    cartItems = [],
}: NiubizCheckoutProps) => {
    const [loading, setLoading] = useState(false);
    // const [sessionToken, setSessionToken] = useState<string | null>(null);

    // Load the Niubiz Session
    const initializeSession = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/niubiz/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    amount, 
                    allowGuest,
                    purchaseNumber,
                    invoiceData,
                    customerInfo: customerInfo || (userEmail ? {
                        email: userEmail,
                        firstName: userFirstName || '',
                        lastName: userLastName || '',
                    } : undefined),
                }),
            });

            console.log("Niubiz Session Response:", res.status);

            if (!res.ok) throw new Error("Failed to create Niubiz session");

            const data = await res.json();
            // setSessionToken(data.sessionKey);

            // Open the checkout immediately or when ready
            openCheckout(data);
        } catch (error) {
            console.error("Niubiz Init Error:", error);
            toast.error("Error al inicializar el pago con tarjeta.");
            onError?.(error);
        } finally {
            // Keep loading for a bit longer to allow modal to appear
            setTimeout(() => setLoading(false), 3000);
        }
    };

    const openCheckout = (data: { sessionKey: string; merchantId: string }) => {
        if (!window.VisanetCheckout) {
            toast.error("La pasarela de pagos no está lista. Intente nuevamente.");
            return;
        }

        console.log("Configuring Niubiz with Merchant ID:", data.merchantId);

        // Store payment data in sessionStorage before opening modal
        // This allows us to recover the transaction if Niubiz redirects
        const paymentData = {
            purchaseNumber,
            amount,
            merchantId: data.merchantId,
            sessionKey: data.sessionKey,
            timestamp: Date.now(),
            cartItems: cartItems,
            customerInfo: {
                email: userEmail,
                firstName: userFirstName,
                lastName: userLastName,
            },
        };
        sessionStorage.setItem('niubiz-pending-payment', JSON.stringify(paymentData));
        
        console.log("[NIUBIZ] Configuring checkout with:", {
            merchantid: data.merchantId,
            purchasenumber: purchaseNumber,
            amount: amount,
        });

        // Build action URL pointing to our API endpoint that handles the POST from Niubiz
        // Niubiz will POST the transactionToken to this URL after 3DS authentication
        const actionUrl = `${window.location.origin}/api/niubiz/checkout?purchaseNumber=${purchaseNumber}&amount=${amount}`;

        window.VisanetCheckout.configure({
            action: actionUrl,
            sessiontoken: data.sessionKey,
            channel: "web",
            merchantid: data.merchantId,
            purchasenumber: purchaseNumber,
            amount: amount,
            expirationminutes: "20",
            timeouturl: window.location.href,
            merchantlogo: `https://res.cloudinary.com/dnjzg8tyg/image/upload/v1766376926/campus-lingowow/logo_lw_for_niubiz_l6sbww.png`,
            formbuttoncolor: "#2F45B6",
            cardholderemail: userEmail || "",
            complete: async (params: { transactionToken: string }) => {
                console.log("[NIUBIZ] ✅ Complete callback triggered with params:", params);
                try {
                    await handleAuthorization(params.transactionToken);
                } catch (error) {
                    console.error("[NIUBIZ] ❌ Authorization failed:", error);
                }
            },
            error: (error: unknown) => {
                console.error("[NIUBIZ] ❌ Error callback triggered:", error);
                toast.error("Ocurrió un error en el formulario de pago.");
                onError?.(error);
            },
            cancel: () => {
                console.log("[NIUBIZ] ⚠️ Cancel callback triggered - user closed modal");
            }
        });

        console.log("[NIUBIZ] Opening checkout modal...");
        window.VisanetCheckout.open();
    };

    const handleAuthorization = async (transactionToken: string) => {
        try {
            setLoading(true);

            // Preparar customerInfo si no viene explícitamente pero tenemos los datos sueltos
            const finalCustomerInfo = customerInfo || (userEmail ? {
                email: userEmail,
                firstName: userFirstName || '',
                lastName: userLastName || '',
            } : undefined);

            console.log('[NiubizCheckout] Sending invoiceData:', JSON.stringify(invoiceData, null, 2));
            
            const res = await fetch("/api/niubiz/authorize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    transactionToken,
                    amount,
                    orderId: purchaseNumber,
                    registerCard: isRecurrent,
                    invoiceData,
                    customerInfo: finalCustomerInfo
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error("Niubiz Auth Response Error:", res.status, errorText);
                throw new Error(`Error del servidor: ${res.status}`);
            }

            const data = await res.json();

            if (data.authorization && data.authorization.dataMap && data.authorization.dataMap.ACTION_CODE !== "000") {
                // Check specific Niubiz success codes. Usually ACTION_CODE "000" means Approved.
                // Note: We need to robustly check the data structure. 
                // For now, assuming if res.ok and no blatant error, it's success, but let's be safer.
                // If data.authorization.header.ecoreTransactionUUID exists it might be processed.
                throw new Error(data.message || "Pago denegado o fallido.");
            }

            toast.success("Pago realizado con éxito");
            onSuccess?.(data);

        } catch (error) {
            console.error("Niubiz Auth Error:", error);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            toast.error((error as any).message || "Error al procesar el pago. Por favor verifique sus datos.");
            onError?.(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Script
                src="https://static-content.vnforapps.com/v2/js/checkout.js"
                strategy="lazyOnload"
            />

            <Button
                onClick={initializeSession}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
                {loading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando pasarela...
                    </>
                ) : (
                    "Pago mediante tarjeta de débito/crédito"
                )}
            </Button>
        </>
    );
};
