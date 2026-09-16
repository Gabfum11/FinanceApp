import {View} from "react-native"
import {Text,TextInput,Button, Snackbar } from "react-native-paper"
import {useEffect, useState } from "react"
import { API_URL } from "@/config";
import { router, useLocalSearchParams } from "expo-router";
import * as SecureStore from "expo-secure-store"
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "@/styles/verify-email.styles";
const num=[0,1,2,3,4,5]
const formatTime =(totseconds:number)=>{
    const minutes=Math.floor(totseconds/60);
    const seconds=totseconds%60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;

}
export default function verify_email(){
    const [code,setCode]=useState("")
    const[step,setStep]=useState<"typing" | "invalid" | "correct">("typing")
    const {email}=useLocalSearchParams();
    const [secondsleft,setSecondsLeft]=useState(0);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);

    useEffect(()=>{
        if (secondsleft===0) return;
        const intervalID=setInterval(()=>{
            setSecondsLeft((prev)=>prev-1)
        },1000); //eseguita ogni secondo, serve clearInterval per fermarla
        return ()=>clearInterval(intervalID);
    },
    [secondsleft] //use effect si riesegue ogni volta che secondsleft cambia
    )
    function handleCodeChange(text: string) {
        const cleaned = text.replace(/[^0-9]/g, "").slice(0, 6);
        setCode(cleaned);
    }
    async function handleResendCode() {
        try{
            setLoading(true)
            const response = await fetch(`${API_URL}/auth/resendOTP`, {
                method:"POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({email, purpose:"email_verification"})
            })
            if(!response.ok) {
                const error= await response.json();
                setErrorMessage(error.detail)
                setSnackbarVisible(true)
                console.log("errore nell'invio del nuovo codice")
                return;
            }
            console.log("nuovo codice inviato")
            setSecondsLeft(60);
            setCode("");

        }catch(error){
             console.log("errore di rete", error)
        }finally{
            setLoading(false)
        }

    }
    async function handleVerify() {
        try{
            setLoading(true)
            const response= await fetch(`${API_URL}/auth/verify-otp`,{
                method:"POST",
                headers:{"Content-Type": "application/json"},
                body:JSON.stringify({email,code, purpose:"email_verification"})
            })
            if(!response.ok)
            {
                const error= await response.json()
                setErrorMessage(error.detail)
                setSnackbarVisible(true)
               console.log("Codice errato",error);
               setStep("invalid")
               return;
            }
            setStep("correct")
            const data= await response.json();
            await SecureStore.setItemAsync("token", data.access_token);
            console.log("registrazione riuscita, token salvato");
        } catch(error){
            console.log("errore di rete", error)
        }finally{
            setLoading(false)
        }

    }
    return(
        <View style={styles.container}>
            {step==="typing" ? (
            <>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="email-outline" size={32} color="#2ECC71"/>
            </View>
            <Text style={styles.title} variant="titleMedium">Controlla la posta</Text>
            <Text style={styles.subtitle} variant="bodyMedium">Ho inviato un codice a 6 cifre a {email}</Text>
            <View style={styles.codeRow}>
                {num.map((index)=>(
                    <View
                        key={index}
                        style={[styles.codeBox, index === code.length && styles.codeBoxActive]}
                    >
                        {/* se code[index] non esiste (l'utente non ha ancora digitato abbastanza cifre per riempire quella posizione), usa una stringa vuota invece di mostrare undefined */}
                        <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
                    </View>
                ))}
            </View>
            <TextInput
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            style={styles.hiddenInput}
            />
            <Text>Non l'hai ricevuto?</Text>
            {secondsleft>0  ?(
                <Text style={styles.remainingTime}>Riprova tra {formatTime(secondsleft)}</Text>
            ):(
               <Text style={styles.resendCodeText} onPress={ loading ? undefined:handleResendCode}>{loading ? "Invio in corso...": "Invia nuovo codice"}</Text>
            )}
                <Button
                    style={styles.button}
                    mode="contained"
                    loading={loading}
                    disabled={loading}
                    onPress={handleVerify}>
                Verifica
                </Button>
            </>
            ) : step==="invalid" ? (
            <>
                <View style={styles.erroriconContainer}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#E74C3C" />
                </View>
                <Text style={styles.title} variant="titleMedium">Codice non valido</Text>
                <Text style={styles.subtitle} variant="bodyMedium">Controlla le cifre che hai inserito</Text>
                <Button style={styles.button} onPress={()=>setStep("typing")}>Riprova</Button>
            </>
            ):(
            <>
                <View style={styles.iconContainer}>
                <MaterialCommunityIcons name="check-circle-outline" size={32} color="#2ECC71"></MaterialCommunityIcons>
                </View>
                <Text style={styles.title} variant="titleMedium">Email verificata</Text>
                <Text style={styles.subtitle} variant="bodyMedium">Il tuo account è pronto</Text>
                <Button style={styles.button} onPress={()=> router.replace("/(tabs)/home")}>Inizia</Button>
            </>

            )}
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
            >
                {errorMessage}
            </Snackbar>
        </View>



    )
}
