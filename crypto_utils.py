from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import base64
import hashlib

class AESCipher:
    """
    AES encryption/decryption utility class
    Uses AES-256 in CBC mode
    """
    
    def __init__(self, key):
        """
        Initialize cipher with a key
        :param key: Encryption key (will be hashed to 32 bytes for AES-256)
        """
        # Hash the key to ensure it's 32 bytes for AES-256
        self.key = hashlib.sha256(key.encode()).digest()
    
    def encrypt(self, plaintext):
        """
        Encrypt plaintext message
        :param plaintext: Message to encrypt
        :return: Base64 encoded encrypted message with IV prepended
        """
        # Generate random IV (Initialization Vector)
        iv = get_random_bytes(AES.block_size)
        
        # Create cipher
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        
        # Pad and encrypt
        padded_data = pad(plaintext.encode(), AES.block_size)
        encrypted_data = cipher.encrypt(padded_data)
        
        # Prepend IV to encrypted data and encode as base64
        return base64.b64encode(iv + encrypted_data).decode('utf-8')
    
    def decrypt(self, encrypted_message):
        """
        Decrypt encrypted message
        :param encrypted_message: Base64 encoded encrypted message with IV
        :return: Decrypted plaintext
        """
        try:
            # Decode from base64
            encrypted_data = base64.b64decode(encrypted_message)
            
            # Extract IV and ciphertext
            iv = encrypted_data[:AES.block_size]
            ciphertext = encrypted_data[AES.block_size:]
            
            # Create cipher and decrypt
            cipher = AES.new(self.key, AES.MODE_CBC, iv)
            decrypted_data = cipher.decrypt(ciphertext)
            
            # Unpad and decode
            plaintext = unpad(decrypted_data, AES.block_size)
            return plaintext.decode('utf-8')
        except Exception as e:
            return f"[Decryption Error: {str(e)}]"

def generate_key():
    """
    Generate a random encryption key
    :return: Base64 encoded random key
    """
    return base64.b64encode(get_random_bytes(32)).decode('utf-8')
