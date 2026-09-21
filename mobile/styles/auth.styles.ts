import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex:1,
    justifyContent:"flex-start",
    padding:24,
    paddingTop:60
  },
  logoContainer: {
    alignItems:"center",
    marginBottom:100,
  },
  logo:{
    width:70,
    height:70,
    borderRadius:16,
  },
  logoLabel:{
    fontWeight:"bold", //spessore/grassetto del testo
    fontSize:20,
    marginTop:10,
  },
  title: {
    marginBottom: 24,
    textAlign: "center",
    fontWeight:"bold",
    fontSize:30
  },
  input: {
    marginBottom: 16,
  },
  inputOutline:{
    borderRadius:14
  },
  checkboxRow:{
    flexDirection:"row",
    alignItems:"center",
  },
  button: {
    marginTop: 8,
  },
  buttonLabel:{
    fontSize:18,
    fontWeight:"bold"
  },
  link:{
    marginTop: 16,
    textAlign:"center",
    fontSize:16
    
  },
  linkAction:{
    color: "#2ECC71",
    fontWeight:"bold"
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5EA",
  },
  dividerText: {
    color: "#999",
  },
  //l'asset Google e' un pulsante completo: sfondo, bordo e testo sono nell'immagine,
  //quindi il contenitore non deve aggiungere grafica propria
  googleButton: {
    alignSelf: "center",
    marginTop: 4,
  },
  googleButtonPressed: {
    opacity: 0.7,
  },
  googleButtonImage: {
    height: 44,
    width: 198, //rapporto 4.5:1 dell'asset ufficiale: alterarlo lo deforma
  }
});
