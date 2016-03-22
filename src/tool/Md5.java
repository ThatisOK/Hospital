package tool;

import java.security.*;

public class Md5 {
	
	/*
	 * 将input转换为32位md5
	 * @param input
	 * @return 转换后的密文
	*/
	
	public String Encryption(String input){
		String output = "";
		try {
			MessageDigest md = MessageDigest.getInstance("md5");
			md.update(input.getBytes());
			byte[] b = md.digest();
			int i;
            StringBuffer buf = new StringBuffer("");
            for (int offset = 0; offset < b.length; offset++) {
                i = b[offset];
                if (i < 0)
                    i += 256;
                if (i < 16)
                    buf.append("0");
                buf.append(Integer.toHexString(i));
            }
            output = buf.toString();
		} catch (NoSuchAlgorithmException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		return output;
		
	}

}
