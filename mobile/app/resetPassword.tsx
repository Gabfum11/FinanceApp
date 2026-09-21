import {View} from "react-native"
import {Text,TextInput,Button, IconButton,Snackbar } from "react-native-paper"
import {useEffect, useState } from "react"
import { API_URL } from "@/config";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "@/styles/reset-password.styles";
const num=[0,1,2,3,4,5]
const formatTime =(totseconds:number)=>{
    const minutes=Math.floor(totseconds/60);
    const seconds=totseconds%60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export default function reset_password(){
   const [email,setEmail]=useState("");
   const [step, setStep]=useState<"email" | "typing" | "invalid" | "correct" | "saved">("email");
   const [code,setCode]=useState("")
   const [secondsleft,setSecondsLeft]=useState(0);
   const [new_password,setnew_password]=useState("");
   const[Passtoken,setPassToken]=useState("")
   const [loading, setLoading] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");
   const [snackbarVisible, setSnackbarVisible] = useState(false);  
   const[showPassword, setShowPassword]=useState(false);

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
    async function handleVerify() {
      try{
        setLoading(true)
         const response= await fetch(`${API_URL}/auth/verify-otp`,{
                method:"POST",
                headers:{"Content-Type": "application/json"},
                body:JSON.stringify({email,code, purpose:"password_reset"})
            })
            if(!response.ok)
            {
                const error= await response.json()
               console.log("Codice errato",error);
               setErrorMessage(error.detail)
               setSnackbarVisible(true)
               setStep("invalid")
               return;
            }
            const data= await response.json();
            setPassToken(data.access_token);
            setStep("correct")

      }catch(error){
         console.log("errore di rete", error)
      }finally{
        setLoading(false)
      }
    }
    async function handleResendCode() {
        try{
            setLoading(true)
            const response = await fetch(`${API_URL}/auth/resendOTP`, {
                method:"POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({email, purpose:"password_reset"})
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
        } finally{
            setLoading(false)
        }

    }
   async function handleSendCode() {
       try{
          setLoading(true)
          const response = await fetch(`${API_URL}/auth/resendOTP`,{
              method:"POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({email, purpose:"password_reset"})
          })
          if(!response.ok) {
            const error= await response.json();
            setErrorMessage(error.detail)
            setSnackbarVisible(true)
                 console.log("errore nell'invio del nuovo codice")
                 return;
             }
             setStep("typing");
 
       }catch(error){
           console.log("errore di rete", error)
       }finally{
        setLoading(false)
       }
   }
   async function handleSavePassword() {
        try{
            setLoading(true)
            const response= await fetch(`${API_URL}/auth/resetPassword`, {
                method:"POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization" : `Bearer ${Passtoken}`

                },
                body: JSON.stringify({new_password, purpose:"password_reset"})
            })
            if(!response.ok) {
                const error= await response.json();
                setErrorMessage(error.detail)
                setSnackbarVisible(true)
                 console.log("errore nel salvataggio della password")
                 return;
            }
            setStep("saved")


        }catch(error)
        {
            console.log("errore di rete", error)
        }finally{
            setLoading(false)
        }
   }
   return(
      <View>
        <IconButton
            icon="chevron-left"
            iconColor="#000"
            size={28}
            onPress={()=>router.back()}
            />
         {step==="email" ? (
         <>
            <View style={styles.iconContainer}>
                 <MaterialCommunityIcons name="lock-outline" size={32} color="#F5A623"/>
            </View>
          <Text style={styles.title} variant="titleMedium">Password dimenticata?</Text>
          <Text style={styles.subtitle} variant="bodyMedium">Inserisci l'email dell'account: ti mando un codice da inserire per impostarne una nuova</Text>
          <TextInput
             label="Email"
             value={email}
             onChangeText={setEmail}
             autoCapitalize="none"
             mode="outlined"
             outlineStyle={styles.inputOutline}
             keyboardType="email-address"
             style={styles.input}
          />
          <Button 
          onPress={handleSendCode}
          mode="contained"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          loading={loading}
          disabled={loading}
          >Invia codice</Button>
      </>
      ): step==="typing" ? (
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
                        <Text style={styles.resendCodeText} onPress={loading ? undefined :handleResendCode}>{loading ? "Invio in corso..." : "Invia nuovo codice"}</Text>
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
      ):step=="invalid" ?(
         <>
            <View style={styles.erroriconContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={32} color="#E74C3C" />
            </View>
            <Text style={styles.title} variant="titleMedium">Codice non valido</Text>
            <Text style={styles.subtitle} variant="bodyMedium">Controlla le cifre che hai inserito</Text>
            <Button style={styles.button} onPress={()=>setStep("typing")}>Riprova</Button>
        </>

      ): step=="correct" ?(
        <>
            <View>
                <Text style={styles.title} variant="titleMedium">Scegline una nuova</Text>
                <Text style={styles.subtitle} variant="bodyMedium">Almeno 8 caratteri</Text>
                <TextInput
                    label="Password"
                    value={new_password}
                    onChangeText={setnew_password}
                    secureTextEntry={!showPassword} //nasconde i caratteri(mostra pallini o asteriscghi)
                    mode="outlined"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                    right={
                <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowPassword(!showPassword)} 
                />
                    }
                />
                <Button 
                    mode="contained" 
                    onPress={handleSavePassword} 
                    style={styles.button}
                    labelStyle={styles.buttonLabel}
                    loading={loading}
                    disabled={loading}
                >
                    Salva password
                </Button>
            </View>
        </>
      ): (
        <>
         <View>
            <View style={styles.successIconContainer}>
                <MaterialCommunityIcons name="check-bold" size={32} color="white"/>
            </View>
            <Text style={styles.title} variant="titleMedium">Password Aggiornata</Text>
            <Text style={styles.subtitle} variant="bodyMedium">Puoi accedere subito con la nuova password</Text>
            <Button
                mode="contained"
                style={styles.button}
                onPress={()=>router.replace("/login")}
                labelStyle={styles.buttonLabel}
            >
                Vai all'accesso
            </Button>
         </View>
        </>
      )}
      <Snackbar
    visible={snackbarVisible}
    onDismiss={() => setSnackbarVisible(false)}
    >
    {errorMessage}
</Snackbar>
   </View>
); 
}