import { StyleSheet } from "react-native";
import { colors } from "./tokens";

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
    color: colors.primary,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
  },
});
