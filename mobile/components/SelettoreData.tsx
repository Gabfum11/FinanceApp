import DateTimePicker from "@react-native-community/datetimepicker";

//sul telefono il calendario nativo. Nel browser quella libreria non esiste:
//SelettoreData.web.tsx usa il campo data del browser con le stesse props
export const SelettoreData = DateTimePicker;
